package com.ecommerce.vendor.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorRegisterRequest {

    // ── Store Info ────────────────────────────────────────────────────────────
    @NotBlank(message = "Store name is required")
    @Size(max = 150, message = "Store name must not exceed 150 characters")
    private String storeName;

    private String storeDescription;

    // ── Business Contact (Optional) ───────────────────────────────────────────
    @Size(max = 20)
    private String businessPhone;

    private String businessAddress;

    // ── Compliance (Optional) ──────────────────────────────────────────────────
    private String gstin;

    private String panNumber;

    // ── Banking Details (Optional) ───────────────────────────────────────────
    @Size(max = 150)
    private String bankAccountName;

    private String bankAccountNumber;

    private String bankIfscCode;
}
