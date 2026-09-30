package com.ecommerce.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO sent by payment-service when admin initiates a vendor weekly payout.
 * Triggers the "Payout Received" email to the vendor.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorPayoutRequest {

    @NotBlank(message = "Vendor email is required")
    @Email(message = "Must be a valid email address")
    private String vendorEmail;

    @NotBlank(message = "Vendor name is required")
    private String vendorName;

    /** The store/shop name of the vendor */
    private String storeName;

    /** Net amount transferred (90% share) formatted as currency string */
    private String amount;

    /** Gross earnings before platform fee */
    private String grossAmount;

    /** Platform fee deducted (10%) */
    private String platformFee;

    /** Transfer method used: NEFT, IMPS, or UPI */
    private String transferMethod;

    /** Bank transaction UTR/reference number provided by admin */
    private String referenceNumber;

    /** Date of transfer (formatted string) */
    private String transferDate;

    /** Masked bank account number for display (e.g., •••• 4321) */
    private String maskedAccountNumber;
}
