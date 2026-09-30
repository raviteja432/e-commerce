package com.ecommerce.notification.kafka;

import com.ecommerce.notification.dto.OrderConfirmationRequest;
import com.ecommerce.notification.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

/**
 * Kafka Consumer for 'order_completed' topic.
 * Receives order details published by order-service and sends order confirmation email.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderCompletedConsumer {

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    @KafkaListener(
            topics = "${kafka.topic.order-completed:order_completed}",
            groupId = "${spring.kafka.consumer.group-id:notification-group}"
    )
    public void consumeOrderCompleted(String message) {
        log.info("Received Kafka message on 'order_completed' topic: {}", message);
        try {
            OrderConfirmationRequest request = objectMapper.readValue(message, OrderConfirmationRequest.class);
            log.info("Processing order confirmation email for orderId: {}, email: {}", request.getOrderId(), request.getCustomerEmail());
            notificationService.sendOrderConfirmation(request);
        } catch (Exception e) {
            log.error("Failed to process OrderCompleted Kafka message: {}", e.getMessage(), e);
        }
    }
}
