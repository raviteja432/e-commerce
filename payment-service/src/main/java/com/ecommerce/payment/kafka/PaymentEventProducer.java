package com.ecommerce.payment.kafka;

import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.kafka.dto.PaymentCompletedEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

/**
 * Kafka Producer service responsible for publishing payment events.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${kafka.topic.payment-completed:payment_completed}")
    private String paymentCompletedTopic;

    /**
     * Publishes a PaymentCompletedEvent to the Kafka topic.
     */
    public void publishPaymentCompleted(Payment payment, String paymentStatus, String failureReason) {
        try {
            PaymentCompletedEvent event = PaymentCompletedEvent.builder()
                    .customerEmail(payment.getCustomerEmail())
                    .customerName(payment.getCustomerName())
                    .orderId(payment.getOrderId())
                    .amount(payment.getAmount())
                    .paymentStatus(paymentStatus)
                    .paymentId(payment.getStripePaymentIntentId())
                    .failureReason(failureReason != null ? failureReason : "")
                    .build();

            String jsonPayload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(paymentCompletedTopic, payment.getOrderId().toString(), jsonPayload);

            log.info("Published PaymentCompletedEvent ({}) to Kafka topic '{}' for orderId: {}",
                    paymentStatus, paymentCompletedTopic, payment.getOrderId());

        } catch (Exception e) {
            log.error("Failed to publish PaymentCompletedEvent for orderId {}: {}", payment.getOrderId(), e.getMessage(), e);
        }
    }
}
