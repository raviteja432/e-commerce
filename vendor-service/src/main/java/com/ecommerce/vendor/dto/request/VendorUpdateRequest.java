package com.ecommerce.vendor.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VendorUpdateRequest {

    @NotBlank(message = "Store name is required")
    private String storeName;

    private String storeDescription;
    private String businessEmail;
    private String businessPhone;
    private String businessAddress;
    private String websiteUrl;
    private String logoUrl;
    private String bannerUrl;
}
