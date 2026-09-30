package com.ecommerce.cart.controller;

import com.ecommerce.cart.dto.request.AddToCartRequest;
import com.ecommerce.cart.dto.request.UpdateCartItemRequest;
import com.ecommerce.cart.dto.response.CartResponse;
import com.ecommerce.cart.dto.response.MessageResponse;
import com.ecommerce.cart.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller exposing REST endpoints for public shopping cart management.
 * Security enforcement and retrieval of the authenticated user's ID
 * (passed in the X-User-Id header) are performed at the Gateway level.
 */
@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    /**
     * Retrieves the cart contents for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<CartResponse> getCart(@RequestHeader("X-User-Id") Long userId) {
        CartResponse response = cartService.getCart(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Adds a product to the user's shopping cart.
     */
    @PostMapping
    public ResponseEntity<CartResponse> addToCart(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody AddToCartRequest request) {
        CartResponse response = cartService.addToCart(userId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Updates the quantity of a specific item in the user's cart.
     */
    @PutMapping("/items/{itemId}")
    public ResponseEntity<CartResponse> updateCartItem(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemRequest request) {
        CartResponse response = cartService.updateCartItem(userId, itemId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Removes a specific item from the user's cart.
     */
    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<MessageResponse> removeItem(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long itemId) {
        MessageResponse response = cartService.removeItem(userId, itemId);
        return ResponseEntity.ok(response);
    }

    /**
     * Clears all items from the user's cart.
     */
    @DeleteMapping
    public ResponseEntity<MessageResponse> clearCart(@RequestHeader("X-User-Id") Long userId) {
        MessageResponse response = cartService.clearCart(userId);
        return ResponseEntity.ok(response);
    }
}
