package com.ecommerce.order.service;

import com.ecommerce.order.dto.request.OrderRequest;
import com.ecommerce.order.dto.response.OrderResponse;

import java.util.List;
import java.util.Map;

/**
 * Interface defining the contract for Order Service business logic.
 */
public interface OrderService {

    /**
     * Creates a new order for the user by reading the cart, reducing stock,
     * persisting order data, and clearing the cart.
     */
    OrderResponse createOrder(Long userId, OrderRequest request);

    /**
     * Retrieves all orders placed by a specific user.
     */
    List<OrderResponse> getOrdersForUser(Long userId);

    /**
     * Retrieves all orders placed by customers that contain items for a specific vendor.
     */
    List<OrderResponse> getOrdersForVendor(Long vendorId);

    /**
     * Cancels an order if eligible (PENDING or PROCESSING state).
     */
    OrderResponse cancelOrder(Long userId, Long orderId, String reason);

    /**
     * Requests return or exchange for a delivered order.
     */
    OrderResponse requestReturnOrExchange(Long userId, Long orderId, String action, String reason, String comments);

    /**
     * Retrieves a single order's full details, verifying that it belongs to the requesting user.
     */
    OrderResponse getOrderDetails(Long userId, Long orderId);

    /**
     * Returns order statistics for a vendor (total orders, pending orders).
     * Used internally by Vendor Service.
     */
    Map<String, Long> getVendorOrderStats(Long vendorId);

    /**
     * Updates an order's status and returns the updated OrderResponse.
     */
    OrderResponse updateOrderStatusAndReturn(Long orderId, String newStatus);

    /**
     * Updates an order's status.
     * Called internally by payment-service after webhook verification.
     */
    void updateOrderStatus(Long orderId, String newStatus);

    /**
     * Returns vendor breakdown (vendorId -> item subtotal sum) for an order.
     * Called internally by payment-service on payment success to calculate vendor earnings.
     */
    Map<Long, java.math.BigDecimal> getVendorBreakdownForOrder(Long orderId);
    /**
     * Retrieves IDs of all orders that are no longer PENDING (used for vendor earning sync).
     */
    List<Long> getNonPendingOrderIds();
}
