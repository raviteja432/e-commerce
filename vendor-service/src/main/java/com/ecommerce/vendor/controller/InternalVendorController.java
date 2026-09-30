package com.ecommerce.vendor.controller;

import com.ecommerce.vendor.dto.request.VendorRegisterRequest;
import com.ecommerce.vendor.dto.response.VendorResponse;
import com.ecommerce.vendor.service.VendorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/internal/vendors")
@RequiredArgsConstructor
public class InternalVendorController {

    private final VendorService vendorService;

    @PostMapping("/register")
    public ResponseEntity<VendorResponse> registerVendor(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody VendorRegisterRequest request) {
        VendorResponse response = vendorService.registerVendor(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/by-user/{userId}/status")
    public ResponseEntity<Map<String, String>> getVendorStatus(@PathVariable Long userId) {
        String status = vendorService.getVendorStatusByUserId(userId);
        return ResponseEntity.ok(Map.of("status", status));
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<VendorResponse> getVendorByUserId(@PathVariable Long userId) {
        VendorResponse response = vendorService.getVendorByUserId(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{vendorId}")
    public ResponseEntity<VendorResponse> getVendorById(@PathVariable Long vendorId) {
        VendorResponse response = vendorService.getVendorById(vendorId);
        return ResponseEntity.ok(response);
    }
}
