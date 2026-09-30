package com.ecommerce.vendor.controller;

import com.ecommerce.vendor.dto.request.VendorUpdateRequest;
import com.ecommerce.vendor.dto.response.VendorResponse;
import com.ecommerce.vendor.dto.response.VendorStatsResponse;
import com.ecommerce.vendor.service.VendorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vendors")
@RequiredArgsConstructor
public class VendorController {

    private final VendorService vendorService;

    @GetMapping("/me")
    public ResponseEntity<VendorResponse> getMyProfile(@RequestHeader("X-User-Id") Long userId) {
        VendorResponse response = vendorService.getVendorByUserId(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Creates a vendor profile for a user who doesn't have one yet.
     * Used by the vendor onboarding form on first setup.
     */
    @PostMapping("/me")
    public ResponseEntity<VendorResponse> createProfile(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody VendorUpdateRequest request) {
        // Try to get existing profile first (idempotent)
        try {
            VendorResponse existing = vendorService.getVendorByUserId(userId);
            // Profile exists — update it instead
            VendorResponse updated = vendorService.updateVendorProfile(userId, request);
            return ResponseEntity.ok(updated);
        } catch (Exception notFound) {
            // No profile yet — build a minimal register request from the update request
            com.ecommerce.vendor.dto.request.VendorRegisterRequest registerRequest =
                com.ecommerce.vendor.dto.request.VendorRegisterRequest.builder()
                    .storeName(request.getStoreName())
                    .storeDescription(request.getStoreDescription())
                    .businessPhone(request.getBusinessPhone() != null ? request.getBusinessPhone() : "")
                    .businessAddress(request.getBusinessAddress() != null ? request.getBusinessAddress() : "")
                    .build();
            VendorResponse response = vendorService.registerVendor(userId, registerRequest);
            return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED).body(response);
        }
    }

    @PutMapping("/me")
    public ResponseEntity<VendorResponse> updateProfile(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody VendorUpdateRequest request) {
        VendorResponse response = vendorService.updateVendorProfile(userId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me/stats")
    public ResponseEntity<VendorStatsResponse> getMyStats(@RequestHeader("X-User-Id") Long userId) {
        VendorStatsResponse response = vendorService.getVendorStats(userId);
        return ResponseEntity.ok(response);
    }
}
