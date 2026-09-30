package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.response.UserResponse;
import com.ecommerce.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Internal endpoints called only by other microservices.
 * NOT exposed via API Gateway.
 */
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalController {

    private final AuthService authService;

    /**
     * Get basic user info by userId — called by other services
     * GET /api/internal/users/{userId}
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long userId) {
        return ResponseEntity.ok(authService.getProfile(userId));
    }
}
