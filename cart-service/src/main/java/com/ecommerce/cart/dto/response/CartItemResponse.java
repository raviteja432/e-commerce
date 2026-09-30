package com.ecommerce.cart.dto.response;

import lombok.*;

import java.math.BigDecimal;

/**
 * Represents a single product line inside a cart response.
 * Enriched with product details (name, image, price) fetched from the Product Service.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItemResponse {

    private Long itemId;         // The cart_items row ID
    private Long productId;
    private String productName;
    private String productImage; // Primary image URL from product-service
    private BigDecimal price;    // Current selling price (fetched live from product-service)
    private int quantity;
    private BigDecimal lineTotal; // price * quantity
    private int stockQuantity;   // Available stock (so frontend can cap the quantity picker)
    private boolean available;   // false if the product is no longer active
}
