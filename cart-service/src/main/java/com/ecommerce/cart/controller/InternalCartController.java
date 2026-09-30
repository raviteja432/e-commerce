package com.ecommerce.cart.controller;

import com.ecommerce.cart.dto.response.InternalCartResponse;
import com.ecommerce.cart.dto.response.MessageResponse;
import com.ecommerce.cart.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller exposing endpoints for internal, inter-service communication.
 * These endpoints are accessed directly by other microservices (such as Order Service)
 * and are not routed through the API Gateway.
 */
@RestController
@RequestMapping("/api/internal/cart")
@RequiredArgsConstructor
public class InternalCartController {

    private final CartService cartService;

    /**
     * Retrieves the cart details in a simplified format for the Order Service.
     */
    @GetMapping("/{userId}")
    public ResponseEntity<InternalCartResponse> getCartInternal(@PathVariable Long userId) {
        InternalCartResponse response = cartService.getCartInternal(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Clears the user's cart. Typically called by the Order Service after successful checkout/payment.
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<MessageResponse> clearCartInternal(@PathVariable Long userId) {
        MessageResponse response = cartService.clearCart(userId);
        return ResponseEntity.ok(response);
    }
}
