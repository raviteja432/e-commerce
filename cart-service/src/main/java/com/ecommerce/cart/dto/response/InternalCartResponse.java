package com.ecommerce.cart.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Internal cart response — sent to the Order Service when it reads the cart
 * contents before creating an order. Simpler shape than CartResponse;
 * just the data needed to build order rows.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InternalCartResponse {

    private Long cartId;
    private Long userId;
    private List<InternalCartItemResponse> items;
    private BigDecimal total;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class InternalCartItemResponse {
        private Long productId;
        private int quantity;
        private BigDecimal price;     // Snapshot price from product-service
        private String productName;   // Snapshot name
        private String productImage;  // Snapshot primary image URL
        private Long vendorId;
    }
}
