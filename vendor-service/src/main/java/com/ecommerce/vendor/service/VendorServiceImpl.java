package com.ecommerce.vendor.service;

import com.ecommerce.vendor.dto.request.VendorRegisterRequest;
import com.ecommerce.vendor.dto.request.VendorUpdateRequest;
import com.ecommerce.vendor.dto.response.VendorResponse;
import com.ecommerce.vendor.dto.response.VendorStatsResponse;
import com.ecommerce.vendor.entity.Vendor;
import com.ecommerce.vendor.exception.BadRequestException;
import com.ecommerce.vendor.exception.ResourceNotFoundException;
import com.ecommerce.vendor.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class VendorServiceImpl implements VendorService {

    private final VendorRepository vendorRepository;
    private final EmailService emailService;
    private final com.ecommerce.vendor.config.EncryptionService encryptionService;
    private final RestTemplate restTemplate;

    @Value("${auth.service.url}")
    private String authServiceUrl;

    @Value("${product.service.url}")
    private String productServiceUrl;

    @Value("${order.service.url}")
    private String orderServiceUrl;

    @Override
    @Transactional
    public VendorResponse registerVendor(Long userId, VendorRegisterRequest request) {
        if (vendorRepository.existsByUserId(userId)) {
            throw new BadRequestException("Vendor profile already exists for this user ID");
        }

        Vendor vendor = Vendor.builder()
                .userId(userId)
                .storeName(request.getStoreName())
                .storeDescription(request.getStoreDescription())
                .businessPhone(request.getBusinessPhone())
                .businessAddress(request.getBusinessAddress())
                .gstin(request.getGstin())
                .panNumber(request.getPanNumber())
                .bankAccountName(request.getBankAccountName())
                .bankAccountNumberEnc(encryptionService.encrypt(request.getBankAccountNumber()))
                .bankIfscCode(request.getBankIfscCode())
                .status(Vendor.Status.PENDING)   // Requires admin approval before activation
                .build();

        vendor = vendorRepository.save(vendor);
        log.info("Vendor profile submitted for approval — user: {}, store: {}", userId, request.getStoreName());

        // Send registration confirmation email to the vendor
        final Long savedUserId = vendor.getUserId();
        final String storeName = vendor.getStoreName();
        try {
            String userUrl = authServiceUrl + "/api/internal/users/" + savedUserId;
            ResponseEntity<Map> response = restTemplate.getForEntity(userUrl, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("email")) {
                String email = (String) response.getBody().get("email");
                emailService.sendVendorRegistrationEmail(email, storeName);
            }
        } catch (Exception e) {
            log.warn("Could not send registration email for user {}: {}", savedUserId, e.getMessage());
        }

        return mapToResponse(vendor);
    }

    @Override
    public VendorResponse getVendorByUserId(Long userId) {
        Vendor vendor = vendorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor profile not found for user ID: " + userId));
        return mapToResponse(vendor);
    }

    @Override
    public VendorResponse getVendorById(Long id) {
        Vendor vendor = vendorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor profile not found for ID: " + id));
        return mapToResponse(vendor);
    }

    @Override
    @Transactional
    public VendorResponse updateVendorProfile(Long userId, VendorUpdateRequest request) {
        Vendor vendor = vendorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor profile not found for user ID: " + userId));

        if (vendor.getStatus() == Vendor.Status.REJECTED) {
            throw new BadRequestException("Cannot update profile of a rejected vendor");
        }

        vendor.setStoreName(request.getStoreName());
        vendor.setStoreDescription(request.getStoreDescription());
        vendor.setBusinessEmail(request.getBusinessEmail());
        vendor.setBusinessPhone(request.getBusinessPhone());
        vendor.setBusinessAddress(request.getBusinessAddress());
        vendor.setWebsiteUrl(request.getWebsiteUrl());
        vendor.setLogoUrl(request.getLogoUrl());
        vendor.setBannerUrl(request.getBannerUrl());

        vendor = vendorRepository.save(vendor);
        log.info("Vendor profile updated for user: {}", userId);
        return mapToResponse(vendor);
    }

    @Override
    public VendorStatsResponse getVendorStats(Long userId) {
        Vendor vendor = vendorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor profile not found for user ID: " + userId));

        Long vendorId = vendor.getId();
        long totalProducts = 0;
        long totalOrders = 0;
        long pendingOrders = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;

        // Call Product Service for total products
        try {
            String productCountUrl = productServiceUrl + "/api/internal/vendors/" + vendorId + "/products/count";
            ResponseEntity<Map> response = restTemplate.getForEntity(productCountUrl, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("count")) {
                totalProducts = ((Number) response.getBody().get("count")).longValue();
            }
        } catch (Exception e) {
            log.error("Failed to fetch product count from Product Service for vendor {}: {}", vendorId, e.getMessage());
        }

        // Call Order Service for order stats
        try {
            String orderStatsUrl = orderServiceUrl + "/api/internal/orders/vendor/" + vendorId + "/stats";
            ResponseEntity<Map> response = restTemplate.getForEntity(orderStatsUrl, Map.class);
            if (response.getBody() != null) {
                Map<String, Object> stats = response.getBody();
                if (stats.containsKey("totalOrders")) {
                    totalOrders = ((Number) stats.get("totalOrders")).longValue();
                }
                if (stats.containsKey("pendingOrders")) {
                    pendingOrders = ((Number) stats.get("pendingOrders")).longValue();
                }
                if (stats.containsKey("totalRevenue") && stats.get("totalRevenue") != null) {
                    totalRevenue = new BigDecimal(stats.get("totalRevenue").toString());
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch order stats from Order Service for vendor {}: {}", vendorId, e.getMessage());
        }

        return VendorStatsResponse.builder()
                .totalProducts(totalProducts)
                .totalOrders(totalOrders)
                .pendingOrders(pendingOrders)
                .totalRevenue(totalRevenue)
                .build();
    }

    @Override
    public Page<VendorResponse> getVendorsByStatus(String status, Pageable pageable) {
        Page<Vendor> vendors;
        if (status == null || status.isBlank()) {
            vendors = vendorRepository.findAll(pageable);
        } else {
            try {
                Vendor.Status statusEnum = Vendor.Status.valueOf(status.toUpperCase());
                vendors = vendorRepository.findByStatus(statusEnum, pageable);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid vendor status: " + status);
            }
        }
        return vendors.map(this::mapToResponse);
    }

    @Override
    @Transactional
    public VendorResponse approveVendor(Long vendorId) {
        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor profile not found for ID: " + vendorId));

        if (vendor.getStatus() != Vendor.Status.PENDING) {
            throw new BadRequestException("Only PENDING vendors can be approved. Current status: " + vendor.getStatus());
        }

        vendor.setStatus(Vendor.Status.APPROVED);
        vendor.setApprovedAt(LocalDateTime.now());
        vendor.setRejectionReason(null);
        vendor = vendorRepository.save(vendor);
        log.info("Vendor approved: {}", vendorId);

        // Fetch vendor user email from Auth Service
        try {
            String userUrl = authServiceUrl + "/api/internal/users/" + vendor.getUserId();
            ResponseEntity<Map> response = restTemplate.getForEntity(userUrl, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("email")) {
                String email = (String) response.getBody().get("email");
                emailService.sendVendorApprovalEmail(email, vendor.getStoreName());
            }
        } catch (Exception e) {
            log.error("Failed to fetch user email or send approval email for vendor {}: {}", vendorId, e.getMessage());
        }

        return mapToResponse(vendor);
    }

    @Override
    @Transactional
    public VendorResponse rejectVendor(Long vendorId, String reason) {
        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor profile not found for ID: " + vendorId));

        if (vendor.getStatus() != Vendor.Status.PENDING) {
            throw new BadRequestException("Only PENDING vendors can be rejected. Current status: " + vendor.getStatus());
        }

        vendor.setStatus(Vendor.Status.REJECTED);
        vendor.setRejectionReason(reason);
        vendor = vendorRepository.save(vendor);
        log.info("Vendor rejected: {} for reason: {}", vendorId, reason);

        // Fetch vendor user email from Auth Service
        try {
            String userUrl = authServiceUrl + "/api/internal/users/" + vendor.getUserId();
            ResponseEntity<Map> response = restTemplate.getForEntity(userUrl, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("email")) {
                String email = (String) response.getBody().get("email");
                emailService.sendVendorRejectionEmail(email, vendor.getStoreName(), reason);
            }
        } catch (Exception e) {
            log.error("Failed to fetch user email or send rejection email for vendor {}: {}", vendorId, e.getMessage());
        }

        return mapToResponse(vendor);
    }

    @Override
    public String getVendorStatusByUserId(Long userId) {
        return vendorRepository.findByUserId(userId)
                .map(v -> v.getStatus().name())
                .orElse("NOT_REGISTERED");
    }

    private VendorResponse mapToResponse(Vendor vendor) {
        // Mask account number for normal (non-admin) responses
        String maskedAccount = vendor.getBankAccountNumberEnc() != null
                ? encryptionService.maskAccountNumber(encryptionService.decrypt(vendor.getBankAccountNumberEnc()))
                : null;

        return VendorResponse.builder()
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
                .maskedAccountNumber(maskedAccount)
                .bankIfscCode(vendor.getBankIfscCode())
                .status(vendor.getStatus().name())
                .rejectionReason(vendor.getRejectionReason())
                .approvedAt(vendor.getApprovedAt())
                .createdAt(vendor.getCreatedAt())
                .updatedAt(vendor.getUpdatedAt())
                .build();
    }

    /**
     * Admin-only: returns fully decrypted bank account number for payout processing.
     */
    public String getDecryptedBankAccount(Long vendorId) {
        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new com.ecommerce.vendor.exception.ResourceNotFoundException("Vendor not found: " + vendorId));
        return encryptionService.decrypt(vendor.getBankAccountNumberEnc());
    }
}
