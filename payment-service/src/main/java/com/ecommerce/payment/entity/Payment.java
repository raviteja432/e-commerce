package com.ecommerce.payment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Persists every payment transaction created for an order.
 * One order can have multiple Payment rows if the customer retries after failure.
 */
@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The internal order ID from order-service */
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    /** Stripe's PaymentIntent ID — e.g., pi_3... */
    @Column(name = "stripe_payment_intent_id", unique = true, nullable = false, length = 255)
    private String stripePaymentIntentId;

    /** Amount in the smallest currency unit (paise for INR, cents for USD) */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "inr";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.PENDING;

    /** Customer email — passed to notification-service on webhook */
    @Column(name = "customer_email", nullable = false, length = 255)
    private String customerEmail;

    /** Customer name — passed to notification-service on webhook */
    @Column(name = "customer_name", nullable = false, length = 255)
    private String customerName;

    /** Stripe failure message for FAILED payments */
    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
