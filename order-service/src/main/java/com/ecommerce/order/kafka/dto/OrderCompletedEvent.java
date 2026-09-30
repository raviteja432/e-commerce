package com.ecommerce.order.kafka.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Event published to Kafka topic 'order_completed' when an order is confirmed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderCompletedEvent {

    private String customerEmail;
    private String customerName;
    private Long orderId;
    private String shippingAddress;
    private String paymentMethod;
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
