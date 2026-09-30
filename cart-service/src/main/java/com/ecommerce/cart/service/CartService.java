package com.ecommerce.cart.service;

import com.ecommerce.cart.dto.request.AddToCartRequest;
import com.ecommerce.cart.dto.request.UpdateCartItemRequest;
import com.ecommerce.cart.dto.response.*;
import com.ecommerce.cart.entity.Cart;
import com.ecommerce.cart.entity.CartItem;
import com.ecommerce.cart.exception.BadRequestException;
import com.ecommerce.cart.exception.ResourceNotFoundException;
import com.ecommerce.cart.redis.CartRedisRepository;
import com.ecommerce.cart.repository.CartItemRepository;
import com.ecommerce.cart.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * CartService handles all shopping cart operations with Redis primary caching + MySQL persistence.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final CartRedisRepository cartRedisRepository;
    private final RestTemplate restTemplate;

    @Value("${product.service.url}")
    private String productServiceUrl;

    // ─────────────────────────────────────────────────────────────
    // GET CART  (loads cart + enriches each item with live product data)
    // ─────────────────────────────────────────────────────────────

    /**
     * Returns the full cart for a user, enriched with current price/stock/image
     * fetched from the Product Service for every item.
     */
    public CartResponse getCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        return buildCartResponse(cart);
    }

    // ─────────────────────────────────────────────────────────────
    // ADD TO CART
    // ─────────────────────────────────────────────────────────────

    /**
     * Adds a product to the user's cart.
     * Steps:
     *  1. Validate product existence and stock via Product Service.
     *  2. Get (or create) the user's cart.
     *  3. If the product already exists in the cart, increase its quantity.
     *  4. Otherwise insert a new CartItem row.
     */
    @Transactional
    public CartResponse addToCart(Long userId, AddToCartRequest request) {
        // Step 1: Validate product and available stock
        Map<String, Object> productDetails = fetchProductDetails(request.getProductId());
        int availableStock = ((Number) productDetails.get("stockQuantity")).intValue();
        boolean isActive = Boolean.TRUE.equals(productDetails.get("active"));

        if (!isActive) {
            throw new BadRequestException("This product is no longer available");
        }
        if (availableStock < request.getQuantity()) {
            throw new BadRequestException("Only " + availableStock + " units available in stock");
        }

        // Step 2: Get or create cart
        Cart cart = getOrCreateCart(userId);

        // Step 3: Check if item already in cart
        Optional<CartItem> existingItem = cartItemRepository
                .findByCartIdAndProductId(cart.getId(), request.getProductId());

        if (existingItem.isPresent()) {
            // Increase quantity — but cap it at available stock
            CartItem item = existingItem.get();
            int newQty = item.getQuantity() + request.getQuantity();
            if (newQty > availableStock) {
                throw new BadRequestException(
                    "Cannot add more. Maximum available stock is " + availableStock + " units");
            }
            item.setQuantity(newQty);
            cartItemRepository.save(item);
            cartRedisRepository.addItem(userId, request.getProductId(), newQty);
            log.info("Updated quantity for productId {} in cart {}", request.getProductId(), cart.getId());
        } else {
            // Step 4: Add new item
            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .productId(request.getProductId())
                    .quantity(request.getQuantity())
                    .build();
            cart.addItem(newItem);
            cartRepository.save(cart);
            cartRedisRepository.addItem(userId, request.getProductId(), request.getQuantity());
            log.info("Added productId {} to cart {}", request.getProductId(), cart.getId());
        }

        // Refresh and return updated cart
        cart = cartRepository.findById(cart.getId()).orElseThrow();
        return buildCartResponse(cart);
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE ITEM QUANTITY
    // ─────────────────────────────────────────────────────────────

    /**
     * Updates the quantity of a specific cart item.
     * If quantity is 0, the item is removed from the cart automatically.
     */
    @Transactional
    public CartResponse updateCartItem(Long userId, Long itemId, UpdateCartItemRequest request) {
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found: " + itemId));

        // Security: Make sure this item belongs to the requesting user's cart
        if (!item.getCart().getUserId().equals(userId)) {
            throw new BadRequestException("You do not have permission to update this cart item");
        }

        if (request.getQuantity() == 0) {
            // Treat quantity=0 as a remove request
            Cart cart = item.getCart();
            cart.removeItem(item);
            cartRepository.save(cart);
            cartRedisRepository.removeItem(userId, item.getProductId());
            log.info("Removed itemId {} from cart (quantity set to 0)", itemId);
        } else {
            // Validate new quantity against stock
            Map<String, Object> productDetails = fetchProductDetails(item.getProductId());
            int availableStock = ((Number) productDetails.get("stockQuantity")).intValue();
            if (request.getQuantity() > availableStock) {
                throw new BadRequestException("Only " + availableStock + " units available in stock");
            }
            item.setQuantity(request.getQuantity());
            cartItemRepository.save(item);
            cartRedisRepository.addItem(userId, item.getProductId(), request.getQuantity());
            log.info("Updated itemId {} quantity to {}", itemId, request.getQuantity());
        }

        Cart updatedCart = cartRepository.findByUserId(userId).orElseThrow();
        return buildCartResponse(updatedCart);
    }

    // ─────────────────────────────────────────────────────────────
    // REMOVE SINGLE ITEM
    // ─────────────────────────────────────────────────────────────

    /**
     * Removes one specific product line from the cart entirely.
     */
    @Transactional
    public MessageResponse removeItem(Long userId, Long itemId) {
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found: " + itemId));

        // Security check
        if (!item.getCart().getUserId().equals(userId)) {
            throw new BadRequestException("You do not have permission to remove this cart item");
        }

        Cart cart = item.getCart();
        cart.removeItem(item);
        cartRepository.save(cart);
        cartRedisRepository.removeItem(userId, item.getProductId());
        log.info("Removed itemId {} from cart for userId {}", itemId, userId);
        return new MessageResponse("Item removed from cart");
    }

    // ─────────────────────────────────────────────────────────────
    // CLEAR ENTIRE CART
    // ─────────────────────────────────────────────────────────────

    /**
     * Removes ALL items from the user's cart.
     * Called by the user (e.g., "Clear Cart" button) or internally by Order Service after payment.
     */
    @Transactional
    public MessageResponse clearCart(Long userId) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for user: " + userId));
        cart.getItems().clear();
        cartRepository.save(cart);
        cartRedisRepository.clearCart(userId);
        log.info("Cleared cart for userId {}", userId);
        return new MessageResponse("Cart cleared successfully");
    }

    // ─────────────────────────────────────────────────────────────
    // INTERNAL — Used by Order Service to read cart contents
    // ─────────────────────────────────────────────────────────────

    /**
     * Returns raw cart data for the Order Service when it builds an order.
     * Includes a snapshot of product name, price, and vendorId per item.
     */
    public InternalCartResponse getCartInternal(Long userId) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found for user: " + userId));

        List<InternalCartResponse.InternalCartItemResponse> internalItems = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (CartItem item : cart.getItems()) {
            try {
                Map<String, Object> pd = fetchProductDetails(item.getProductId());
                BigDecimal price = new BigDecimal(pd.get("price").toString());
                BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(item.getQuantity()));
                total = total.add(lineTotal);

                // Resolve primary image URL
                String imageUrl = null;
                Object imagesObj = pd.get("images");
                if (imagesObj instanceof List<?> images && !((List<?>) images).isEmpty()) {
                    Object firstImg = ((List<?>) images).get(0);
                    if (firstImg instanceof Map<?,?> imgMap) {
                        imageUrl = (String) imgMap.get("imageUrl");
                    }
                }

                internalItems.add(InternalCartResponse.InternalCartItemResponse.builder()
                        .productId(item.getProductId())
                        .quantity(item.getQuantity())
                        .price(price)
                        .productName((String) pd.get("name"))
                        .productImage(imageUrl)
                        .vendorId(pd.get("vendorId") != null
                                ? ((Number) pd.get("vendorId")).longValue() : null)
                        .build());
            } catch (Exception e) {
                log.warn("Could not fetch details for productId {}: {}", item.getProductId(), e.getMessage());
            }
        }

        return InternalCartResponse.builder()
                .cartId(cart.getId())
                .userId(userId)
                .items(internalItems)
                .total(total)
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────

    /**
     * Retrieves or creates a cart for the given userId.
     * This ensures every user automatically gets a cart on first use.
     */
    private Cart getOrCreateCart(Long userId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> {
            Cart newCart = Cart.builder().userId(userId).build();
            Cart saved = cartRepository.save(newCart);
            log.info("Created new cart for userId {}", userId);
            return saved;
        });
    }

    /**
     * Calls Product Service to get current product details (price, stock, name, images).
     * This calls product-service directly (not through the gateway) so no JWT is required.
     * Uses the public product detail endpoint to get image URLs needed to enrich the cart response.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchProductDetails(Long productId) {
        try {
            // Direct service-to-service call (bypasses gateway), so no Authorization header needed.
            String url = productServiceUrl + "/api/products/" + productId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            log.error("Failed to fetch product details for productId {}: {}", productId, e.getMessage());
        }
        throw new BadRequestException("Product not found or Product Service unavailable for productId: " + productId);
    }

    /**
     * Builds the rich CartResponse DTO by enriching each CartItem with product details
     * fetched from the Product Service.
     */
    private CartResponse buildCartResponse(Cart cart) {
        List<CartItemResponse> itemResponses = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CartItem item : cart.getItems()) {
            try {
                Map<String, Object> pd = fetchProductDetails(item.getProductId());
                BigDecimal price = new BigDecimal(pd.get("price").toString());
                BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(item.getQuantity()));
                subtotal = subtotal.add(lineTotal);

                int stock = ((Number) pd.get("stockQuantity")).intValue();
                boolean active = Boolean.TRUE.equals(pd.get("active"));

                // Resolve primary image URL from the images list
                String imageUrl = null;
                Object imagesObj = pd.get("images");
                if (imagesObj instanceof List<?> images && !((List<?>) images).isEmpty()) {
                    Object firstImg = ((List<?>) images).get(0);
                    if (firstImg instanceof Map<?,?> imgMap) {
                        imageUrl = (String) imgMap.get("imageUrl");
                    }
                }

                itemResponses.add(CartItemResponse.builder()
                        .itemId(item.getId())
                        .productId(item.getProductId())
                        .productName((String) pd.get("name"))
                        .productImage(imageUrl)
                        .price(price)
                        .quantity(item.getQuantity())
                        .lineTotal(lineTotal)
                        .stockQuantity(stock)
                        .available(active)
                        .build());

            } catch (Exception e) {
                // If Product Service is down, still show the item but mark as unavailable
                log.warn("Could not enrich cart item {}: {}", item.getId(), e.getMessage());
                itemResponses.add(CartItemResponse.builder()
                        .itemId(item.getId())
                        .productId(item.getProductId())
                        .productName("Product Unavailable")
                        .quantity(item.getQuantity())
                        .available(false)
                        .build());
            }
        }

        return CartResponse.builder()
                .cartId(cart.getId())
                .userId(cart.getUserId())
                .items(itemResponses)
                .subtotal(subtotal)
                .itemCount(itemResponses.size())
                .build();
    }
}
