package com.ecommerce.payment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Tracks how much the platform owes each vendor after a successful payment.
 *
 * When a payment succeeds:
 *   totalAmount = full customer payment
 *   platformFee = totalAmount * 10%
 *   vendorEarning = totalAmount * 90%
 *
 * Admin pays weekly. Status: PENDING → PAID
 */
@Entity
@Table(name = "vendor_earnings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorEarning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** vendorId from vendor-service */
    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    /** orderId that generated this earning */
    @Column(name = "order_id", nullable = false)
    private Long orderId;

    /** Stripe paymentIntentId for traceability */
    @Column(name = "payment_intent_id", length = 255)
    private String paymentIntentId;

    /** Full amount paid by customer */
    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    /** 10% platform commission */
    @Column(name = "platform_fee", nullable = false, precision = 12, scale = 2)
    private BigDecimal platformFee;

    /** 90% — amount owed to vendor */
    @Column(name = "vendor_earning", nullable = false, precision = 12, scale = 2)
    private BigDecimal vendorEarning;

    /** ISO week of the year (e.g. "2025-W32") — groups by payout week */
    @Column(name = "payout_week", length = 10)
    private String payoutWeek;

    @Enumerated(EnumType.STRING)
    @Column(name = "payout_status", nullable = false, length = 20)
    @Builder.Default
    private PayoutStatus payoutStatus = PayoutStatus.PENDING;

    /** Admin notes when marking as paid (e.g. transaction reference) */
    @Column(name = "admin_notes", length = 500)
    private String adminNotes;

    /** When the admin marked this as paid */
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum PayoutStatus {
        PENDING,   // Earned but not yet paid
        PAID       // Admin has transferred money to vendor
    }
}
