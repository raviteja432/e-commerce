package com.ecommerce.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request DTO sent by payment-service when a payment is confirmed or fails.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentNotificationRequest {

    @NotBlank(message = "Customer email is required")
    @Email(message = "Must be a valid email address")
    private String customerEmail;

    @NotBlank(message = "Customer name is required")
    private String customerName;

    @NotNull(message = "Order ID is required")
    private Long orderId;

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    /** "SUCCESS" or "FAILED" */
    @NotBlank(message = "Payment status is required")
    private String paymentStatus;

    /** Razorpay payment ID for the success email receipt */
    private String paymentId;

    /** Failure reason for the failed email */
    private String failureReason;
}
