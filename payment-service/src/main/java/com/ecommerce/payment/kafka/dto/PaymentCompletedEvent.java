package com.ecommerce.payment.kafka.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Event published to Kafka topic 'payment_completed' when a payment succeeds or fails.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCompletedEvent {

    private String customerEmail;
    private String customerName;
    private Long orderId;
    private BigDecimal amount;
    private String paymentStatus; // "SUCCESS" or "FAILED"
    private String paymentId;
    private String failureReason;
}
