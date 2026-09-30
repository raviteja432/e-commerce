package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * Data Transfer Object for submitting a customer product review.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewRequest {

    @NotNull(message = "Rating score is required")
    @Min(value = 1, message = "Rating must be at least 1 star")
    @Max(value = 5, message = "Rating cannot exceed 5 stars")
    private Integer rating;

    @Size(max = 200, message = "Title must be under 200 characters")
    private String title;

    @NotBlank(message = "Review body content is required")
    private String body;
}
