package com.ecommerce.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request DTO sent by order-service when a new order is placed.
 * Contains everything needed to render the "Order Confirmed" email.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderConfirmationRequest {

    @NotBlank(message = "Customer email is required")
    @Email(message = "Must be a valid email address")
    private String customerEmail;

    @NotBlank(message = "Customer name is required")
    private String customerName;

    @NotNull(message = "Order ID is required")
    private Long orderId;

    @NotBlank(message = "Shipping address is required")
    private String shippingAddress;

    @NotBlank(message = "Payment method is required")
    private String paymentMethod;

    @NotNull(message = "Total amount is required")
    private BigDecimal totalAmount;

    private List<OrderItemDetail> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemDetail {
        private String productName;
        private int quantity;
        private BigDecimal price;
    }
}
