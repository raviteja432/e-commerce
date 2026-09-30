package com.ecommerce.order.controller;

import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller exposing internal endpoints for inter-service communication.
 * Not routed through the API Gateway — consumed directly by Vendor Service.
 */
@RestController
@RequestMapping("/api/internal/orders")
@RequiredArgsConstructor
public class InternalOrderController {

    private final OrderService orderService;

    /**
     * Returns order statistics (total and pending orders) for a specific vendor.
     * Called by Vendor Service when building the vendor dashboard stats.
     */
    @GetMapping("/vendor/{vendorId}/stats")
    public ResponseEntity<Map<String, Long>> getVendorOrderStats(@PathVariable Long vendorId) {
        Map<String, Long> stats = orderService.getVendorOrderStats(vendorId);
        return ResponseEntity.ok(stats);
    }

    /**
     * Updates an order's status. Called internally by payment-service after webhook confirmation.
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {
        String status = request.get("status");
        orderService.updateOrderStatus(id, status);
        return ResponseEntity.ok(Map.of("message", "Order status updated to " + status));
    }

    /**
     * Returns vendor breakdown (vendorId -> total) for an order.
     * Called internally by payment-service on payment success.
     */
    @GetMapping("/{id}/vendor-breakdown")
    public ResponseEntity<Map<Long, java.math.BigDecimal>> getVendorBreakdown(@PathVariable Long id) {
        Map<Long, java.math.BigDecimal> breakdown = orderService.getVendorBreakdownForOrder(id);
        return ResponseEntity.ok(breakdown);
    }

    /**
     * Returns IDs of all non-PENDING orders (used by payment-service to sync vendor earnings).
     */
    @GetMapping("/non-pending-ids")
    public ResponseEntity<java.util.List<Long>> getNonPendingOrderIds() {
        java.util.List<Long> ids = orderService.getNonPendingOrderIds();
        return ResponseEntity.ok(ids);
    }
}
