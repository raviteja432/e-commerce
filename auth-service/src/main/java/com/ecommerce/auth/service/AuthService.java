package com.ecommerce.auth.service;

import com.ecommerce.auth.dto.request.*;
import com.ecommerce.auth.dto.response.*;
import com.ecommerce.auth.entity.PasswordResetToken;
import com.ecommerce.auth.entity.User;
import com.ecommerce.auth.exception.*;
import com.ecommerce.auth.repository.PasswordResetTokenRepository;
import com.ecommerce.auth.repository.UserRepository;
import com.ecommerce.auth.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final RestTemplate restTemplate;

    @Value("${vendor.service.url}")
    private String vendorServiceUrl;

    // ─────────────────────────────────────────────────────────────
    // REGISTER
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public MessageResponse register(RegisterRequest request) {
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email is already registered");
        }

        // Parse role
        User.Role role;
        try {
            role = User.Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role. Must be CUSTOMER or VENDOR");
        }

        // Vendor must provide store name
        if (role == User.Role.VENDOR && (request.getStoreName() == null || request.getStoreName().isBlank())) {
            throw new BadRequestException("Store name is required for vendor registration");
        }

        // Save user to DB
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(role)
                .active(true)
                .build();
        user = userRepository.save(user);

        // If VENDOR, create vendor profile in Vendor Service
        if (role == User.Role.VENDOR) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("X-User-Id", user.getId().toString());
                headers.set("X-User-Role", "VENDOR");

                Map<String, String> vendorPayload = new java.util.HashMap<>();
                vendorPayload.put("storeName", request.getStoreName());
                vendorPayload.put("storeDescription", request.getStoreDescription() != null ? request.getStoreDescription() : "");
                vendorPayload.put("businessPhone", request.getBusinessPhone() != null ? request.getBusinessPhone() : "");
                vendorPayload.put("businessAddress", request.getBusinessAddress() != null ? request.getBusinessAddress() : "");
                vendorPayload.put("gstin", request.getGstin() != null ? request.getGstin() : "");
                vendorPayload.put("panNumber", request.getPanNumber() != null ? request.getPanNumber() : "");
                vendorPayload.put("bankAccountName", request.getBankAccountName() != null ? request.getBankAccountName() : "");
                vendorPayload.put("bankAccountNumber", request.getBankAccountNumber() != null ? request.getBankAccountNumber() : "");
                vendorPayload.put("bankIfscCode", request.getBankIfscCode() != null ? request.getBankIfscCode() : "");



                HttpEntity<Map<String, String>> entity = new HttpEntity<>(vendorPayload, headers);
                restTemplate.postForEntity(
                        vendorServiceUrl + "/api/internal/vendors/register",
                        entity,
                        Map.class
                );
                log.info("Vendor profile created for userId: {}", user.getId());
            } catch (Exception e) {
                log.error("Failed to create vendor profile for userId {}: {}", user.getId(), e.getMessage());
                // Don't fail registration — vendor profile creation can be retried
            }
        }

        log.info("New {} registered: {}", role, request.getEmail());
        return new MessageResponse("Account created successfully! Please login.");
    }

    // ─────────────────────────────────────────────────────────────
    // LOGIN
    // ─────────────────────────────────────────────────────────────

    public AuthResponse login(LoginRequest request) {
        // Find user by email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        // Check if account is active
        if (!user.isActive()) {
            throw new ForbiddenException("Your account has been disabled. Please contact support.");
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        // If VENDOR, check approval status via Vendor Service
        if (user.getRole() == User.Role.VENDOR) {
            try {
                String statusUrl = vendorServiceUrl + "/api/internal/vendors/by-user/" + user.getId() + "/status";
                ResponseEntity<Map> response = restTemplate.getForEntity(statusUrl, Map.class);
                if (response.getBody() != null) {
                    String status = (String) response.getBody().get("status");
                    if ("PENDING".equals(status)) {
                        throw new ForbiddenException("Your vendor account is pending admin approval.");
                    } else if ("REJECTED".equals(status)) {
                        throw new ForbiddenException("Your vendor application was rejected. Please contact support.");
                    }
                }
            } catch (ForbiddenException e) {
                throw e;
            } catch (Exception e) {
                log.warn("Could not check vendor status for userId {}: {}", user.getId(), e.getMessage());
                // Don't block login if vendor service is down
            }
        }

        // Generate JWT
        String token = jwtUtil.generateToken(
                user.getId(), user.getEmail(), user.getRole().name(), user.getName()
        );

        log.info("User logged in: {} ({})", user.getEmail(), user.getRole());

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole().name())
                .name(user.getName())
                .userId(user.getId())
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // FORGOT PASSWORD
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        // Always return 200 to prevent email enumeration attacks
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            // Generate a UUID reset token
            String token = UUID.randomUUID().toString();

            // Save to DB with 15-minute expiry
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .token(token)
                    .expiresAt(LocalDateTime.now().plusMinutes(15))
                    .used(false)
                    .build();
            passwordResetTokenRepository.save(resetToken);

            // Send email asynchronously
            emailService.sendPasswordResetEmail(user.getEmail(), token);
            log.info("Password reset token generated for: {}", user.getEmail());
        });

        return new MessageResponse("If that email is registered, you'll receive a reset link shortly.");
    }

    // ─────────────────────────────────────────────────────────────
    // RESET PASSWORD
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));

        // Check if token is already used
        if (resetToken.isUsed()) {
            throw new BadRequestException("This reset link has already been used");
        }

        // Check if token is expired
        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("This reset link has expired. Please request a new one.");
        }

        // Update password
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Mark token as used
        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        log.info("Password reset successfully for: {}", user.getEmail());
        return new MessageResponse("Password reset successfully. Please login with your new password.");
    }

    // ─────────────────────────────────────────────────────────────
    // GET PROFILE
    // ─────────────────────────────────────────────────────────────

    public UserResponse getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return mapToUserResponse(user);
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE PROFILE
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public MessageResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        user.setName(request.getName());
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        userRepository.save(user);

        log.info("Profile updated for userId: {}", userId);
        return new MessageResponse("Profile updated successfully");
    }

    // ─────────────────────────────────────────────────────────────
    // CHANGE PASSWORD
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public MessageResponse changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        log.info("Password changed for userId: {}", userId);
        return new MessageResponse("Password updated successfully");
    }

    // ─────────────────────────────────────────────────────────────
    // ADMIN — DISABLE/ENABLE USER
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public MessageResponse disableUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setActive(false);
        userRepository.save(user);
        log.info("User disabled: {}", userId);
        return new MessageResponse("User account disabled");
    }

    @Transactional
    public MessageResponse enableUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setActive(true);
        userRepository.save(user);
        log.info("User enabled: {}", userId);
        return new MessageResponse("User account enabled");
    }

    // ─────────────────────────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────────────────────────

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
