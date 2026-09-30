package com.ecommerce.payment.dto;

import lombok.*;

import java.math.BigDecimal;

/**
 * Payment status for a given order — returned by GET /api/payments/status/{orderId}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatusResponse {
    private Long orderId;
    private String stripePaymentIntentId;
    private BigDecimal amount;
    private String currency;
    /** PENDING, SUCCESS, or FAILED */
    private String status;
    private String failureReason;
}
