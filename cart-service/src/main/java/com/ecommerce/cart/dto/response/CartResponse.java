package com.ecommerce.cart.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Full cart response sent back to the frontend when loading the Cart page.
 * Contains all items, the subtotal, and the total item count.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartResponse {

    private Long cartId;
    private Long userId;
    private List<CartItemResponse> items;
    private BigDecimal subtotal;  // Sum of all lineTotal values
    private int itemCount;        // Total number of distinct product lines in the cart
}
