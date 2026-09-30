package com.ecommerce.product.dto.response;

import lombok.*;

import java.math.BigDecimal;

/**
 * Data Transfer Object containing details needed internally by other services (like Cart and Order).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductStockResponse {
    private Long productId;
    private String productName;
    private int stockQuantity;
    private BigDecimal price;
    private Long vendorId;
}
