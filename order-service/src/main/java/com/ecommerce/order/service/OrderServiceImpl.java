package com.ecommerce.order.service;

import com.ecommerce.order.dto.request.OrderRequest;
import com.ecommerce.order.dto.response.OrderItemResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderItem;
import com.ecommerce.order.entity.OrderStatus;
import com.ecommerce.order.exception.BadRequestException;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Implementation of OrderService. Handles:
 *  - Checkout: reads cart → reduces stock → saves order → clears cart
 *  - Order history and details retrieval
 *  - Vendor order statistics for dashboard
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final RestTemplate restTemplate;
    private final com.ecommerce.order.kafka.OrderEventProducer orderEventProducer;

    @Value("${cart.service.url}")
    private String cartServiceUrl;

    @Value("${product.service.url}")
    private String productServiceUrl;

    @Value("${payment.service.url}")
    private String paymentServiceUrl;

    @Value("${notification.service.url}")
    private String notificationServiceUrl;

    @Value("${auth.service.url:http://localhost:8081}")
    private String authServiceUrl;

    // ─────────────────────────────────────────────────────────────
    // CREATE ORDER (CHECKOUT)
    // ─────────────────────────────────────────────────────────────

    /**
     * Full checkout flow:
     * 1. Fetch cart contents from Cart Service (internal endpoint).
     * 2. Validate that the cart is not empty.
     * 3. For each cart item, reduce stock in Product Service.
     * 4. Save the order, items, and customer info in the database.
     * 5. Create a Stripe PaymentIntent in the Payment Service and get the clientSecret.
     * 6. Clear the user's cart via Cart Service (internal endpoint).
     */
    @Override
    @Transactional
    public OrderResponse createOrder(Long userId, OrderRequest request) {
        // Step 1: Retrieve cart
        Map<String, Object> cartData = fetchCartInternal(userId);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> cartItems = (List<Map<String, Object>>) cartData.get("items");
        if (cartItems == null || cartItems.isEmpty()) {
            throw new BadRequestException("Your cart is empty. Please add items before placing an order.");
        }

        // Step 2: Build order entity
        BigDecimal total = new BigDecimal(cartData.get("total").toString());

        String email = request.getCustomerEmail();
        String name = request.getCustomerName();
        if (email == null || email.isBlank() || name == null || name.isBlank()) {
            try {
                String userUrl = authServiceUrl + "/api/internal/users/" + userId;
                ResponseEntity<Map> userResp = restTemplate.getForEntity(userUrl, Map.class);
                if (userResp.getBody() != null) {
                    if (email == null || email.isBlank()) {
                        email = (String) userResp.getBody().get("email");
                    }
                    if (name == null || name.isBlank()) {
                        name = (String) userResp.getBody().get("name");
                    }
                }
            } catch (Exception e) {
                log.warn("Could not fetch user email/name from auth-service for userId {}: {}", userId, e.getMessage());
            }
        }

        Order order = Order.builder()
                .userId(userId)
                .shippingAddress(request.getShippingAddress())
                .paymentMethod(request.getPaymentMethod())
                .customerEmail(email != null ? email : "customer@example.com")
                .customerName(name != null ? name : "Valued Customer")
                .status(OrderStatus.PENDING)
                .totalAmount(total)
                .build();

        // Step 3: Create order items and reduce stock
        for (Map<String, Object> item : cartItems) {
            Long productId = ((Number) item.get("productId")).longValue();
            int quantity = ((Number) item.get("quantity")).intValue();
            BigDecimal price = new BigDecimal(item.get("price").toString());
            String productName = (String) item.get("productName");
            String productImage = (String) item.get("productImage");
            Long vendorId = item.get("vendorId") != null ? ((Number) item.get("vendorId")).longValue() : null;

            // Reduce stock in Product Service
            try {
                String stockUrl = productServiceUrl + "/api/internal/products/" + productId + "/stock/reduce";
                restTemplate.put(stockUrl, Map.of("quantity", quantity));
                log.info("Reduced stock for productId {} by {}", productId, quantity);
            } catch (Exception e) {
                log.error("Failed to reduce stock for productId {}: {}", productId, e.getMessage());
                throw new BadRequestException("Unable to process order: stock update failed for product " + productId);
            }

            OrderItem orderItem = OrderItem.builder()
                    .productId(productId)
                    .productName(productName)
                    .productImage(productImage)
                    .price(price)
                    .quantity(quantity)
                    .vendorId(vendorId)
                    .build();

            order.addItem(orderItem);
        }

        // Step 4: Persist order
        Order savedOrder = orderRepository.save(order);
        log.info("Order {} created for userId {}", savedOrder.getId(), userId);

        // Step 5: If payment method is STRIPE, call payment-service to create a PaymentIntent.
        //         For MOCK payments, skip this step — order is confirmed immediately.
        String clientSecret = null;
        if ("STRIPE".equalsIgnoreCase(request.getPaymentMethod())) {
            try {
                String paymentUrl = paymentServiceUrl + "/api/internal/payments/create-intent";
                Map<String, Object> paymentPayload = new java.util.HashMap<>();
                paymentPayload.put("orderId", savedOrder.getId());
                paymentPayload.put("amount", savedOrder.getTotalAmount());
                paymentPayload.put("customerEmail", savedOrder.getCustomerEmail());
                paymentPayload.put("customerName", savedOrder.getCustomerName());
                paymentPayload.put("currency", "inr");

                @SuppressWarnings("unchecked")
                Map<String, Object> paymentResponse = restTemplate.postForObject(paymentUrl, paymentPayload, Map.class);
                if (paymentResponse != null && paymentResponse.containsKey("clientSecret")) {
                    clientSecret = (String) paymentResponse.get("clientSecret");
                }
            } catch (Exception e) {
                log.error("Failed to create Stripe PaymentIntent for order {}: {}", savedOrder.getId(), e.getMessage());
                throw new BadRequestException("Unable to initiate payment: " + e.getMessage());
            }
        } else {
            // MOCK payment — mark order as confirmed immediately
            log.info("Mock payment selected for order {}. Skipping Stripe intent creation.", savedOrder.getId());
            savedOrder.setStatus(OrderStatus.PROCESSING);
            savedOrder = orderRepository.save(savedOrder);

            // Send order confirmation via Kafka event
            orderEventProducer.publishOrderCompleted(savedOrder);
            triggerVendorEarningRecord(savedOrder.getId());
        }

        // Step 6: Clear the cart
        try {
            String clearCartUrl = cartServiceUrl + "/api/internal/cart/" + userId;
            restTemplate.delete(clearCartUrl);
            log.info("Cart cleared for userId {} after successful order {}", userId, savedOrder.getId());
        } catch (Exception e) {
            log.warn("Order placed but failed to clear cart for userId {}: {}", userId, e.getMessage());
        }

        OrderResponse response = mapToResponse(savedOrder);
        response.setClientSecret(clientSecret);
        return response;
    }

    // ─────────────────────────────────────────────────────────────
    // ORDER HISTORY
    // ─────────────────────────────────────────────────────────────

    @Override
    public List<OrderResponse> getOrdersForUser(Long userId) {
        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return orders.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<OrderResponse> getOrdersForVendor(Long vendorId) {
        List<Order> orders = orderRepository.findOrdersByVendorIdOrderByCreatedAtDesc(vendorId);
        return orders.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // ORDER DETAILS
    // ─────────────────────────────────────────────────────────────

    @Override
    public OrderResponse getOrderDetails(Long userId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        // Ownership check
        if (!order.getUserId().equals(userId)) {
            throw new BadRequestException("You do not have permission to view this order");
        }

        return mapToResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long userId, Long orderId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!order.getUserId().equals(userId)) {
            throw new BadRequestException("You do not have permission to modify this order");
        }

        if (order.getStatus() == OrderStatus.SHIPPED || order.getStatus() == OrderStatus.DELIVERED
                || order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.REFUNDED) {
            throw new BadRequestException("Order cannot be cancelled when it is " + order.getStatus());
        }

        boolean isOnlinePayment = order.getPaymentMethod() != null &&
                !order.getPaymentMethod().toUpperCase().contains("COD") &&
                !order.getPaymentMethod().toUpperCase().contains("CASH");

        if (isOnlinePayment) {
            order.setStatus(OrderStatus.REFUNDED);
            log.info("Order #{} cancelled by user. Payment refund initiated for method {}", orderId, order.getPaymentMethod());
        } else {
            order.setStatus(OrderStatus.CANCELLED);
            log.info("Order #{} cancelled by user (COD payment)", orderId);
        }

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public OrderResponse requestReturnOrExchange(Long userId, Long orderId, String action, String reason, String comments) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!order.getUserId().equals(userId)) {
            throw new BadRequestException("You do not have permission to modify this order");
        }

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new BadRequestException("Return/Exchange request is only applicable for DELIVERED orders");
        }

        if ("EXCHANGE".equalsIgnoreCase(action)) {
            order.setStatus(OrderStatus.EXCHANGE_REQUESTED);
            log.info("Exchange request submitted for Order #{} with reason: {}", orderId, reason);
        } else {
            order.setStatus(OrderStatus.RETURN_REQUESTED);
            log.info("Return request submitted for Order #{} with reason: {}", orderId, reason);
        }

        Order saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    // ─────────────────────────────────────────────────────────────
    // VENDOR STATISTICS (INTERNAL)
    // ─────────────────────────────────────────────────────────────

    @Override
    public Map<String, Long> getVendorOrderStats(Long vendorId) {
        long totalOrders = orderRepository.countTotalOrdersByVendorId(vendorId);
        long pendingOrders = orderRepository.countOrdersByVendorIdAndStatus(vendorId, OrderStatus.PENDING);
        return Map.of("totalOrders", totalOrders, "pendingOrders", pendingOrders);
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE STATUS & TRIGGER EMAIL (INTERNAL)
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public OrderResponse updateOrderStatusAndReturn(Long orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        OrderStatus statusEnum;
        try {
            statusEnum = OrderStatus.valueOf(newStatus.toUpperCase());
            order.setStatus(statusEnum);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid order status: " + newStatus);
        }

        Order saved = orderRepository.save(order);
        log.info("Order #{} status updated to {}", orderId, newStatus);

        // Trigger appropriate email notification based on status
        if (statusEnum == OrderStatus.PROCESSING) {
            orderEventProducer.publishOrderCompleted(saved);
            triggerVendorEarningRecord(saved.getId());
        } else {
            triggerOrderStatusEmail(saved, statusEnum);
        }

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public void updateOrderStatus(Long orderId, String newStatus) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        OrderStatus status = OrderStatus.valueOf(newStatus.toUpperCase());
        order.setStatus(status);
        orderRepository.save(order);
        log.info("Order {} status updated to {}", orderId, status);

        // If payment is successful (PROCESSING status), send order confirmation notification & record earnings
        if (status == OrderStatus.PROCESSING) {
            orderEventProducer.publishOrderCompleted(order);
            triggerVendorEarningRecord(order.getId());
        } else {
            // Trigger shipping/delivery/cancellation email
            triggerOrderStatusEmail(order, status);
        }
    }

    @Override
    public Map<Long, BigDecimal> getVendorBreakdownForOrder(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        Map<Long, BigDecimal> breakdown = new java.util.HashMap<>();
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                if (item.getVendorId() != null) {
                    BigDecimal itemTotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                    breakdown.merge(item.getVendorId(), itemTotal, BigDecimal::add);
                }
            }
        }
        return breakdown;
    }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────

    /**
     * Fetches the cart contents from Cart Service using the internal endpoint.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchCartInternal(Long userId) {
        try {
            String url = cartServiceUrl + "/api/internal/cart/" + userId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            log.error("Failed to fetch cart for userId {}: {}", userId, e.getMessage());
        }
        throw new BadRequestException("Unable to retrieve cart. Please try again.");
    }

    private void triggerOrderConfirmationEmail(Order order) {
        try {
            String email = order.getCustomerEmail();
            String name = order.getCustomerName();

            // Fallback: If customer email or name is missing on order entity, fetch from auth-service
            if (email == null || email.isBlank() || name == null || name.isBlank()) {
                try {
                    String userUrl = authServiceUrl + "/api/internal/users/" + order.getUserId();
                    ResponseEntity<Map> userResp = restTemplate.getForEntity(userUrl, Map.class);
                    if (userResp.getBody() != null) {
                        if (email == null || email.isBlank()) {
                            email = (String) userResp.getBody().get("email");
                        }
                        if (name == null || name.isBlank()) {
                            name = (String) userResp.getBody().get("name");
                        }
                    }
                } catch (Exception ex) {
                    log.warn("Could not fetch user email for order confirmation #{}: {}", order.getId(), ex.getMessage());
                }
            }

            if (email == null || email.isBlank()) {
                log.error("Cannot send order confirmation email for order #{}: customerEmail is missing", order.getId());
                return;
            }

            if (name == null || name.isBlank()) {
                name = "Valued Customer";
            }

            String url = notificationServiceUrl + "/api/internal/notifications/order-confirmation";
            List<Map<String, Object>> itemsList = order.getItems().stream()
                    .map(item -> {
                        Map<String, Object> map = new java.util.HashMap<>();
                        map.put("productName", item.getProductName() != null ? item.getProductName() : "Product");
                        map.put("quantity", item.getQuantity());
                        map.put("price", item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO);
                        return map;
                    })
                    .collect(Collectors.toList());

            Map<String, Object> request = new java.util.HashMap<>();
            request.put("customerEmail", email);
            request.put("customerName", name);
            request.put("orderId", order.getId());
            request.put("shippingAddress", order.getShippingAddress() != null ? order.getShippingAddress() : "Address provided on checkout");
            request.put("paymentMethod", order.getPaymentMethod() != null ? order.getPaymentMethod() : "ONLINE");
            request.put("totalAmount", order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
            request.put("items", itemsList);

            restTemplate.postForEntity(url, request, Map.class);
            log.info("Triggered order confirmation email to {} for order #{}", email, order.getId());
        } catch (Exception e) {
            log.error("Failed to trigger order confirmation email for order #{}: {}", order.getId(), e.getMessage());
        }
    }

    /**
     * Sends shipping / delivery / cancellation email update.
     */
    private void triggerOrderStatusEmail(Order order, OrderStatus status) {
        try {
            String url = notificationServiceUrl + "/api/internal/notifications/order-status";
            Map<String, Object> request = new java.util.HashMap<>();
            request.put("customerEmail", order.getCustomerEmail());
            request.put("customerName", order.getCustomerName());
            request.put("orderId", order.getId());
            request.put("newStatus", status.name());

            restTemplate.postForEntity(url, request, Map.class);
            log.info("Triggered order status email update ({}) for order {}", status.name(), order.getId());
        } catch (Exception e) {
            log.error("Failed to trigger status update email for order {}: {}", order.getId(), e.getMessage());
        }
    }

    @Override
    public List<Long> getNonPendingOrderIds() {
        return orderRepository.findNonPendingOrderIds();
    }

    private void triggerVendorEarningRecord(Long orderId) {
        try {
            String url = paymentServiceUrl + "/api/internal/payments/record-earnings/" + orderId;
            restTemplate.postForEntity(url, null, Map.class);
            log.info("Triggered vendor earning recording for order #{}", orderId);
        } catch (Exception e) {
            log.warn("Could not trigger vendor earning recording for order #{}: {}", orderId, e.getMessage());
        }
    }

    /**
     * Maps an Order entity to an OrderResponse DTO.
     */
    private OrderResponse mapToResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .productImage(item.getProductImage())
                        .price(item.getPrice())
                        .quantity(item.getQuantity())
                        .vendorId(item.getVendorId())
                        .build())
                .collect(Collectors.toList());

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUserId())
                .shippingAddress(order.getShippingAddress())
                .paymentMethod(order.getPaymentMethod())
                .customerEmail(order.getCustomerEmail())
                .customerName(order.getCustomerName())
                .status(order.getStatus().name())
                .totalAmount(order.getTotalAmount())
                .items(itemResponses)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}
