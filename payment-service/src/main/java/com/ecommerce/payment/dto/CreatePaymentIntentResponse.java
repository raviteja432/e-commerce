package com.ecommerce.payment.dto;

import lombok.*;

import java.math.BigDecimal;

/**
 * Returned to order-service after a PaymentIntent is created.
 * The clientSecret is forwarded to the frontend for Stripe.js confirmation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePaymentIntentResponse {

    /** Stripe PaymentIntent ID — pi_3... */
    private String paymentIntentId;

    /**
     * Stripe client secret — used by Stripe.js on the frontend to
     * confirm the payment. Must be kept short-lived and not logged.
     */
    private String clientSecret;

    private BigDecimal amount;
    private String currency;
}
