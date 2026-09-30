package com.ecommerce.order.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Full details of an order returned to the client.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {
    private Long id;
    private Long userId;
    private String shippingAddress;
    private String paymentMethod;
    private String status;
    private BigDecimal totalAmount;
    private List<OrderItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** Stripe PaymentIntent clientSecret — used by the frontend with Stripe.js to confirm payment */
    private String clientSecret;
    private String customerEmail;
    private String customerName;
}
