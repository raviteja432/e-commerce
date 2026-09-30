package com.ecommerce.vendor.dto.response;

import lombok.*;

import java.time.LocalDateTime;

/**
 * Admin-only response — includes fully decrypted bank details for payout processing.
 * Never expose this to non-admin roles.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminVendorDetailResponse {
    private Long id;
    private Long userId;
    private String storeName;
    private String storeDescription;
    private String businessEmail;
    private String businessPhone;
    private String businessAddress;
    private String websiteUrl;
    private String logoUrl;
    private String bannerUrl;

    // Compliance
    private String gstin;
    private String panNumber;

    // Full bank details — decrypted, visible to admin only
    private String bankAccountName;
    private String bankAccountNumber;   // FULL (decrypted)
    private String maskedAccountNumber; // masked display
    private String bankIfscCode;

    /** Stripe Connected Account ID — null until first Stripe payout is initiated */
    private String stripeAccountId;

    private String status;
    private String rejectionReason;
    private LocalDateTime approvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
