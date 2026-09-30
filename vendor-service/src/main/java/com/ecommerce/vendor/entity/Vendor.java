package com.ecommerce.vendor.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "vendors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "store_name", nullable = false, length = 150)
    private String storeName;

    @Column(name = "store_description", columnDefinition = "TEXT")
    private String storeDescription;

    @Column(name = "business_email", length = 150)
    private String businessEmail;

    @Column(name = "business_phone", length = 20)
    private String businessPhone;

    @Column(name = "business_address", columnDefinition = "TEXT")
    private String businessAddress;

    @Column(name = "website_url", length = 255)
    private String websiteUrl;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "banner_url", length = 500)
    private String bannerUrl;

    // ─────────────────────────────────────────────────────────────────────────
    // Financial & Compliance fields (mandatory for vendor registration)
    // ─────────────────────────────────────────────────────────────────────────

    /** GSTIN — Goods and Services Tax Identification Number */
    @Column(name = "gstin", length = 20)
    private String gstin;

    /** PAN card number (mandatory) */
    @Column(name = "pan_number", length = 15)
    private String panNumber;

    /** Bank account holder name — for payout verification */
    @Column(name = "bank_account_name", length = 150)
    private String bankAccountName;

    /** AES-256 encrypted bank account number */
    @Column(name = "bank_account_number_enc", length = 500)
    private String bankAccountNumberEnc;

    /** IFSC code of the vendor's bank branch */
    @Column(name = "bank_ifsc_code", length = 20)
    private String bankIfscCode;

    /** Stripe Connected Account ID — created on first Stripe payout, stored for reuse */
    @Column(name = "stripe_account_id", length = 100)
    private String stripeAccountId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.APPROVED;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public enum Status {
        PENDING,
        APPROVED,
        REJECTED
    }
}
