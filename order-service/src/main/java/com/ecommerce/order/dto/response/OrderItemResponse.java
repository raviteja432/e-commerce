package com.ecommerce.order.dto.response;

import lombok.*;

import java.math.BigDecimal;

/**
 * Detailed representation of an item within an order response.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productImage;
    private BigDecimal price;
    private int quantity;
    private Long vendorId;
}
