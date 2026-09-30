package com.ecommerce.vendor.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorResponse {
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

    // Compliance (visible to vendor & admin)
    private String gstin;
    private String panNumber;

    // Banking — masked for security (e.g. ••••••7890)
    private String bankAccountName;
    private String maskedAccountNumber;
    private String bankIfscCode;

    private String status;
    private String rejectionReason;
    private LocalDateTime approvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
