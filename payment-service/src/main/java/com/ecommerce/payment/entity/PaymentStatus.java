package com.ecommerce.payment.entity;

/**
 * Represents the lifecycle of a payment transaction.
 */
public enum PaymentStatus {
    /** PaymentIntent created, awaiting customer confirmation */
    PENDING,
    /** Stripe confirmed payment_intent.succeeded */
    SUCCESS,
    /** Stripe reported payment_intent.payment_failed */
    FAILED
}
