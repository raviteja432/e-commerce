package com.ecommerce.product.dto.response;

import lombok.*;

/**
 * Data Transfer Object representing product image attachment details in responses.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductImageResponse {
    private Long id;
    private String imageUrl;
    private boolean isPrimary;
    private int displayOrder;
}
