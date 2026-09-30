package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.OrderRequest;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller exposing public REST endpoints for order management.
 * The authenticated user's ID is forwarded via the X-User-Id header set by the Gateway.
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * Places a new order by checking out the user's cart.
     */
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody OrderRequest request) {
        OrderResponse response = orderService.createOrder(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Retrieves the full order history for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<OrderResponse>> getMyOrders(@RequestHeader("X-User-Id") Long userId) {
        List<OrderResponse> orders = orderService.getOrdersForUser(userId);
        return ResponseEntity.ok(orders);
    }

    /**
     * Retrieves all customer orders for a specific vendor.
     */
    @GetMapping("/vendor/{vendorId}")
    public ResponseEntity<List<OrderResponse>> getVendorOrders(@PathVariable Long vendorId) {
        List<OrderResponse> orders = orderService.getOrdersForVendor(vendorId);
        return ResponseEntity.ok(orders);
    }

    /**
     * Cancels an order (eligible for PENDING / PROCESSING orders).
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<OrderResponse> cancelOrder(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body) {
        String reason = body != null ? body.getOrDefault("reason", "Cancelled by customer") : "Cancelled by customer";
        OrderResponse response = orderService.cancelOrder(userId, id, reason);
        return ResponseEntity.ok(response);
    }

    /**
     * Updates an order's status (used by vendors to change status: PENDING -> PROCESSING -> SHIPPED -> DELIVERED).
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        String newStatus = body.get("status");
        OrderResponse response = orderService.updateOrderStatusAndReturn(id, newStatus);
        return ResponseEntity.ok(response);
    }

    /**
     * Submits a Return or Exchange request for a DELIVERED order.
     */
    @PostMapping("/{id}/return")
    public ResponseEntity<OrderResponse> requestReturnOrExchange(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        String action = body.getOrDefault("action", "RETURN");
        String reason = body.getOrDefault("reason", "Customer request");
        String comments = body.getOrDefault("comments", "");
        OrderResponse response = orderService.requestReturnOrExchange(userId, id, action, reason, comments);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves the details of a specific order by ID.
     * Verifies that the order belongs to the requesting user.
     */
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrderDetails(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        OrderResponse response = orderService.getOrderDetails(userId, id);
        return ResponseEntity.ok(response);
    }
}
