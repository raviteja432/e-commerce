package com.ecommerce.product.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Data Transfer Object representing detailed product specifications.
 * Returned when loading the Product Detail page.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductDetailResponse {
    private Long id;
    private String name;
    private String slug;
    private String shortDescription;
    private String description;
    private CategoryResponse category;
    private BigDecimal price;
    private BigDecimal compareAtPrice;
    private int stockQuantity;
    private String sku;
    private boolean active;
    private boolean featured;
    private List<ProductImageResponse> images;
    private Long vendorId;
    private String vendorStoreName;
    private double averageRating;
    private int reviewCount;
}
