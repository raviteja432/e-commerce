package com.ecommerce.payment.service;

import com.ecommerce.payment.dto.CreatePaymentIntentRequest;
import com.ecommerce.payment.dto.CreatePaymentIntentResponse;
import com.ecommerce.payment.dto.PaymentStatusResponse;

/**
 * Contract for payment operations.
 */
public interface PaymentService {

    /**
     * Creates a Stripe PaymentIntent for the given order.
     * Called internally by order-service after saving an order.
     * Returns clientSecret that the frontend uses with Stripe.js.
     */
    CreatePaymentIntentResponse createPaymentIntent(CreatePaymentIntentRequest request);

    /**
     * Handles Stripe webhook events.
     * Verifies the webhook signature, then processes payment_intent.succeeded
     * and payment_intent.payment_failed events.
     *
     * @param payload   raw request body string (must not be pre-parsed)
     * @param sigHeader value of the "Stripe-Signature" HTTP header
     */
    void handleWebhook(String payload, String sigHeader);

    /**
     * Returns the payment status for a given order.
     */
    PaymentStatusResponse getPaymentStatus(Long orderId);

    /**
     * Records 90% vendor share and 10% platform fee for an order into VendorEarning repository.
     */
    void recordVendorEarningsForOrder(Long orderId);
}
