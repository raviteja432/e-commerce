package com.ecommerce.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO sent by order-service when an order's status changes
 * (e.g., PROCESSING → SHIPPED → DELIVERED → CANCELLED).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusUpdateRequest {

    @NotBlank(message = "Customer email is required")
    @Email(message = "Must be a valid email address")
    private String customerEmail;

    @NotBlank(message = "Customer name is required")
    private String customerName;

    @NotNull(message = "Order ID is required")
    private Long orderId;

    /**
     * New order status — one of:
     * PROCESSING, SHIPPED, DELIVERED, CANCELLED
     */
    @NotBlank(message = "New status is required")
    private String newStatus;

    /** Optional tracking number for SHIPPED emails */
    private String trackingNumber;

    /** Optional cancellation reason */
    private String cancellationReason;
}
