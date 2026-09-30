package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.request.AddressRequest;
import com.ecommerce.auth.dto.response.AddressResponse;
import com.ecommerce.auth.dto.response.MessageResponse;
import com.ecommerce.auth.service.AddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers/me/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final AddressService addressService;

    /**
     * Get all saved addresses for the logged-in customer
     * GET /api/customers/me/addresses
     */
    @GetMapping
    public ResponseEntity<List<AddressResponse>> getAddresses(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(addressService.getAddresses(userId));
    }

    /**
     * Add a new address
     * POST /api/customers/me/addresses
     */
    @PostMapping
    public ResponseEntity<AddressResponse> addAddress(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody AddressRequest request) {
        AddressResponse response = addressService.addAddress(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Update an existing address
     * PUT /api/customers/me/addresses/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<AddressResponse> updateAddress(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(addressService.updateAddress(userId, id, request));
    }

    /**
     * Delete an address
     * DELETE /api/customers/me/addresses/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteAddress(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        addressService.deleteAddress(userId, id);
        return ResponseEntity.ok(new MessageResponse("Address deleted successfully"));
    }

    /**
     * Set an address as default
     * PATCH /api/customers/me/addresses/{id}/default
     */
    @PatchMapping("/{id}/default")
    public ResponseEntity<MessageResponse> setDefaultAddress(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        addressService.setDefaultAddress(userId, id);
        return ResponseEntity.ok(new MessageResponse("Default address updated"));
    }
}
