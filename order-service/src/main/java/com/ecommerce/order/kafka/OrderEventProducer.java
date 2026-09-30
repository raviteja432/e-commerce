package com.ecommerce.order.kafka;

import com.ecommerce.order.entity.Order;
import com.ecommerce.order.kafka.dto.OrderCompletedEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Kafka Producer service responsible for publishing order events.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${kafka.topic.order-completed:order_completed}")
    private String orderCompletedTopic;

    /**
     * Publishes an OrderCompletedEvent to the Kafka topic.
     */
    public void publishOrderCompleted(Order order) {
        try {
            List<OrderCompletedEvent.OrderItemDetail> itemDetails = order.getItems().stream()
                    .map(item -> OrderCompletedEvent.OrderItemDetail.builder()
                            .productName(item.getProductName() != null ? item.getProductName() : "Product")
                            .quantity(item.getQuantity())
                            .price(item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO)
                            .build())
                    .collect(Collectors.toList());

            OrderCompletedEvent event = OrderCompletedEvent.builder()
                    .customerEmail(order.getCustomerEmail())
                    .customerName(order.getCustomerName())
                    .orderId(order.getId())
                    .shippingAddress(order.getShippingAddress() != null ? order.getShippingAddress() : "Address provided on checkout")
                    .paymentMethod(order.getPaymentMethod() != null ? order.getPaymentMethod() : "ONLINE")
                    .totalAmount(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO)
                    .items(itemDetails)
                    .build();

            String jsonPayload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(orderCompletedTopic, order.getId().toString(), jsonPayload);

            log.info("Published OrderCompletedEvent to Kafka topic '{}' for orderId: {}", orderCompletedTopic, order.getId());

        } catch (Exception e) {
            log.error("Failed to publish OrderCompletedEvent for orderId {}: {}", order.getId(), e.getMessage(), e);
        }
    }
}
