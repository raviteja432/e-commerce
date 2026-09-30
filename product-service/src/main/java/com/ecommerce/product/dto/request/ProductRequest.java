package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Data Transfer Object for creating or updating a product.
 * Contains properties submitted by the vendor.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductRequest {

    @NotBlank(message = "Product name is required")
    @Size(max = 255, message = "Product name must be under 255 characters")
    private String name;

    @Size(max = 500, message = "Short description must be under 500 characters")
    private String shortDescription;

    private String description;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than zero")
    private BigDecimal price;

    // Optional compare-at (original) price
    private BigDecimal compareAtPrice;

    @Min(value = 0, message = "Stock quantity cannot be negative")
    private int stockQuantity;

    private String sku;

    // List of S3 uploaded image URLs. 
    // The first URL in the list will be treated as the primary product image.
    private List<String> imageUrls;

    @Builder.Default
    private boolean active = true;

    private boolean featured;
}
