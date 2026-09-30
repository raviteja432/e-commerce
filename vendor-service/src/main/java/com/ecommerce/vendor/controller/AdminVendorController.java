package com.ecommerce.vendor.controller;

import com.ecommerce.vendor.config.EncryptionService;
import com.ecommerce.vendor.dto.request.RejectVendorRequest;
import com.ecommerce.vendor.dto.response.AdminVendorDetailResponse;
import com.ecommerce.vendor.dto.response.VendorResponse;
import com.ecommerce.vendor.entity.Vendor;
import com.ecommerce.vendor.exception.ResourceNotFoundException;
import com.ecommerce.vendor.repository.VendorRepository;
import com.ecommerce.vendor.service.VendorServiceImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/vendors")
@RequiredArgsConstructor
public class AdminVendorController {

    private final VendorServiceImpl vendorService;
    private final VendorRepository vendorRepository;
    private final EncryptionService encryptionService;

    /** List all vendors (paginated, filterable by status) — masked bank details */
    @GetMapping
    public ResponseEntity<Page<VendorResponse>> getAllVendors(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<VendorResponse> response = vendorService.getVendorsByStatus(status, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * Get full vendor details including decrypted bank account number — ADMIN ONLY.
     * Used by admin before initiating a payout to the vendor.
     */
    @GetMapping("/{vendorId}")
    public ResponseEntity<AdminVendorDetailResponse> getVendorDetail(@PathVariable Long vendorId) {
        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + vendorId));

        String decrypted = encryptionService.decrypt(vendor.getBankAccountNumberEnc());
        String masked    = encryptionService.maskAccountNumber(decrypted);

        AdminVendorDetailResponse detail = AdminVendorDetailResponse.builder()
                .id(vendor.getId())
                .userId(vendor.getUserId())
                .storeName(vendor.getStoreName())
                .storeDescription(vendor.getStoreDescription())
                .businessEmail(vendor.getBusinessEmail())
                .businessPhone(vendor.getBusinessPhone())
                .businessAddress(vendor.getBusinessAddress())
                .websiteUrl(vendor.getWebsiteUrl())
                .logoUrl(vendor.getLogoUrl())
                .bannerUrl(vendor.getBannerUrl())
                .gstin(vendor.getGstin())
                .panNumber(vendor.getPanNumber())
                .bankAccountName(vendor.getBankAccountName())
                .bankAccountNumber(decrypted)
                .maskedAccountNumber(masked)
                .bankIfscCode(vendor.getBankIfscCode())
                .stripeAccountId(vendor.getStripeAccountId())
                .status(vendor.getStatus().name())
                .rejectionReason(vendor.getRejectionReason())
                .approvedAt(vendor.getApprovedAt())
                .createdAt(vendor.getCreatedAt())
                .updatedAt(vendor.getUpdatedAt())
                .build();

        return ResponseEntity.ok(detail);
    }

    /**
     * Internal: save Stripe Connected Account ID for a vendor after payment-service creates it.
     * Called by payment-service during the first Stripe payout for the vendor.
     */
    @PatchMapping("/{vendorId}/stripe-account")
    public ResponseEntity<Void> saveStripeAccountId(
            @PathVariable Long vendorId,
            @RequestBody java.util.Map<String, String> body) {
        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + vendorId));
        vendor.setStripeAccountId(body.get("stripeAccountId"));
        vendorRepository.save(vendor);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{vendorId}/approve")
    public ResponseEntity<VendorResponse> approveVendor(@PathVariable Long vendorId) {
        VendorResponse response = vendorService.approveVendor(vendorId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{vendorId}/reject")
    public ResponseEntity<VendorResponse> rejectVendor(
            @PathVariable Long vendorId,
            @Valid @RequestBody RejectVendorRequest request) {
        VendorResponse response = vendorService.rejectVendor(vendorId, request.getReason());
        return ResponseEntity.ok(response);
    }
}
