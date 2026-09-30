package com.ecommerce.payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Payment Service — handles Stripe PaymentIntent creation, webhook verification,
 * and inter-service calls to order-service and notification-service.
 *
 * Flow:
 *  1. Order-service internally calls POST /api/internal/payments/create-intent
 *  2. Payment-service creates a Stripe PaymentIntent → returns clientSecret to order-service
 *  3. Frontend uses clientSecret with Stripe.js to confirm payment
 *  4. Stripe calls POST /api/payments/webhook when payment succeeds/fails
 *  5. Payment-service updates order status and sends notification email
 */
@SpringBootApplication
public class PaymentServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(PaymentServiceApplication.class, args);
    }
}
