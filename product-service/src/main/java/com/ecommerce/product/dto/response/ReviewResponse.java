package com.ecommerce.product.dto.response;

import lombok.*;

import java.time.LocalDateTime;

/**
 * Data Transfer Object representing product reviews in responses.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResponse {
    private Long id;
    private Long productId;
    private Long userId;
    private String userName; // Resolved from auth-service user profile details
    private int rating;
    private String title;
    private String body;
    private LocalDateTime createdAt;
}
