package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.response.MessageResponse;
import com.ecommerce.auth.dto.response.UserResponse;
import com.ecommerce.auth.entity.User;
import com.ecommerce.auth.repository.UserRepository;
import com.ecommerce.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminUserController {

    private final AuthService authService;
    private final UserRepository userRepository;

    /**
     * Get all users (paginated, filterable by role)
     * GET /api/admin/users
     * Required role: ADMIN (enforced at Gateway)
     */
    @GetMapping("/users")
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<User> users;

        if (role != null && !role.isBlank()) {
            try {
                User.Role roleEnum = User.Role.valueOf(role.toUpperCase());
                users = userRepository.findByRole(roleEnum, pageable);
            } catch (IllegalArgumentException e) {
                users = userRepository.findAll(pageable);
            }
        } else {
            users = userRepository.findAll(pageable);
        }

        Page<UserResponse> response = users.map(user -> UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .build());

        return ResponseEntity.ok(response);
    }

    /**
     * Disable a user account
     * PATCH /api/admin/users/{userId}/disable
     */
    @PatchMapping("/users/{userId}/disable")
    public ResponseEntity<MessageResponse> disableUser(@PathVariable Long userId) {
        return ResponseEntity.ok(authService.disableUser(userId));
    }

    /**
     * Enable a user account
     * PATCH /api/admin/users/{userId}/enable
     */
    @PatchMapping("/users/{userId}/enable")
    public ResponseEntity<MessageResponse> enableUser(@PathVariable Long userId) {
        return ResponseEntity.ok(authService.enableUser(userId));
    }

    /**
     * Get single user detail
     * GET /api/admin/users/{userId}
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long userId) {
        return ResponseEntity.ok(authService.getProfile(userId));
    }
}
