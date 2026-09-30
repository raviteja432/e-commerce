package com.ecommerce.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank(message = "Role is required")
    private String role; // CUSTOMER or VENDOR

    @NotBlank(message = "Phone number is required")
    private String phone;

    // ── Vendor-only fields (optional when role = VENDOR) ──────────────────────
    private String storeName;
    private String storeDescription;
    private String businessPhone;
    private String businessAddress;
    private String gstin;
    private String panNumber;
    private String bankAccountName;
    private String bankAccountNumber;
    private String bankIfscCode;
}
