package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Data Transfer Object for category creation and update requests.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryRequest {

    @NotBlank(message = "Category name is required")
    private String name;

    // Optional icon or thumbnail URL for the category
    private String iconUrl;

    // Visibility status of the category
    @Builder.Default
    private boolean active = true;
}
