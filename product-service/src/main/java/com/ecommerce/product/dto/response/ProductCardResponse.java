package com.ecommerce.product.dto.response;

import lombok.*;

import java.math.BigDecimal;

/**
 * Data Transfer Object representing a summary of a product.
 * Optimized for grid/card lists to save bandwidth.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductCardResponse {
    private Long id;
    private String name;
    private String slug;
    private String shortDescription;
    private BigDecimal price;
    private BigDecimal compareAtPrice;
    private int stockQuantity;
    private String primaryImageUrl;
    private String categoryName;
    private Long vendorId;
    private String vendorStoreName;
    private boolean active;
    private double averageRating;
    private int reviewCount;
}
