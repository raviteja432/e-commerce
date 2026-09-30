package com.ecommerce.notification.kafka;

import com.ecommerce.notification.dto.PaymentNotificationRequest;
import com.ecommerce.notification.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

/**
 * Kafka Consumer for 'payment_completed' topic.
 * Receives payment status details published by payment-service and sends payment success/failure email.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentCompletedConsumer {

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    @KafkaListener(
            topics = "${kafka.topic.payment-completed:payment_completed}",
            groupId = "${spring.kafka.consumer.group-id:notification-group}"
    )
    public void consumePaymentCompleted(String message) {
        log.info("Received Kafka message on 'payment_completed' topic: {}", message);
        try {
            PaymentNotificationRequest request = objectMapper.readValue(message, PaymentNotificationRequest.class);
            log.info("Processing payment notification email ({}) for orderId: {}, email: {}",
                    request.getPaymentStatus(), request.getOrderId(), request.getCustomerEmail());
            notificationService.sendPaymentNotification(request);
        } catch (Exception e) {
            log.error("Failed to process PaymentCompleted Kafka message: {}", e.getMessage(), e);
        }
    }
}
