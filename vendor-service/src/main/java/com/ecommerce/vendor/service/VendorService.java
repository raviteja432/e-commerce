package com.ecommerce.vendor.service;

import com.ecommerce.vendor.dto.request.VendorRegisterRequest;
import com.ecommerce.vendor.dto.request.VendorUpdateRequest;
import com.ecommerce.vendor.dto.response.VendorResponse;
import com.ecommerce.vendor.dto.response.VendorStatsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface VendorService {
    VendorResponse registerVendor(Long userId, VendorRegisterRequest request);
    VendorResponse getVendorByUserId(Long userId);
    VendorResponse getVendorById(Long id);
    VendorResponse updateVendorProfile(Long userId, VendorUpdateRequest request);
    VendorStatsResponse getVendorStats(Long userId);
    Page<VendorResponse> getVendorsByStatus(String status, Pageable pageable);
    VendorResponse approveVendor(Long vendorId);
    VendorResponse rejectVendor(Long vendorId, String reason);
    String getVendorStatusByUserId(Long userId);
}
