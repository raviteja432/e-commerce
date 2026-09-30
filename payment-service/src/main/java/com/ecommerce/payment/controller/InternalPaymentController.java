package com.ecommerce.payment.controller;

import com.ecommerce.payment.dto.CreatePaymentIntentRequest;
import com.ecommerce.payment.dto.CreatePaymentIntentResponse;
import com.ecommerce.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * Internal controller — called only by order-service after saving an order.
 * Not exposed through the API Gateway.
 */
@RestController
@RequestMapping("/api/internal/payments")
@RequiredArgsConstructor
@Slf4j
public class InternalPaymentController {

    private final PaymentService paymentService;

    /**
     * Creates a Stripe PaymentIntent for a newly placed order.
     * Returns the clientSecret that order-service passes back to the frontend.
     *
     * Called by: order-service immediately after persisting the order.
     */
    @PostMapping("/create-intent")
    public ResponseEntity<CreatePaymentIntentResponse> createPaymentIntent(
            @Valid @RequestBody CreatePaymentIntentRequest request) {

        log.info("Internal payment intent request for orderId={}, amount={}",
                request.getOrderId(), request.getAmount());
        CreatePaymentIntentResponse response = paymentService.createPaymentIntent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Records 90% vendor share and 10% platform fee for an order.
     * Called internally by order-service when an order is confirmed.
     */
    @PostMapping("/record-earnings/{orderId}")
    public ResponseEntity<Map<String, String>> recordVendorEarnings(@PathVariable Long orderId) {
        log.info("Recording vendor earnings for orderId={}", orderId);
        paymentService.recordVendorEarningsForOrder(orderId);
        return ResponseEntity.ok(Map.of("message", "Recorded vendor earnings for order " + orderId));
    }
}
