package com.ecommerce.payment.controller;

import com.ecommerce.payment.dto.MessageResponse;
import com.ecommerce.payment.dto.PaymentStatusResponse;
import com.ecommerce.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Public-facing controller for payment operations.
 *
 * /api/payments/webhook  — called by Stripe, must NOT require JWT
 * /api/payments/status/  — called by authenticated frontend users
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * Stripe webhook endpoint.
     *
     * Must receive the raw request body (not pre-parsed JSON) so the
     * HMAC-SHA256 signature can be verified against the exact byte sequence.
     *
     * Stripe calls this directly — NOT routed through the Gateway JWT filter.
     */
    @PostMapping("/webhook")
    public ResponseEntity<MessageResponse> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        log.info("Stripe webhook received");
        paymentService.handleWebhook(payload, sigHeader);
        return ResponseEntity.ok(new MessageResponse("Webhook processed"));
    }

    /**
     * Returns the current payment status for an order.
     * Called by the authenticated frontend to poll/check payment result.
     * Requires X-User-Id header (set by Gateway JWT filter).
     */
    @GetMapping("/status/{orderId}")
    public ResponseEntity<PaymentStatusResponse> getPaymentStatus(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long orderId) {

        PaymentStatusResponse response = paymentService.getPaymentStatus(orderId);
        return ResponseEntity.ok(response);
    }
}
