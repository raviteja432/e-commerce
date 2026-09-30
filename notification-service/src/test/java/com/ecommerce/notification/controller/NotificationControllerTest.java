package com.ecommerce.notification.controller;

import com.ecommerce.notification.dto.OrderConfirmationRequest;
import com.ecommerce.notification.dto.OrderStatusUpdateRequest;
import com.ecommerce.notification.dto.PaymentNotificationRequest;
import com.ecommerce.notification.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NotificationController.class)
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private NotificationService notificationService;

    // ─────────────────────────────────────────────────────────────────────────
    // ORDER CONFIRMATION
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void sendOrderConfirmation_ValidRequest_ShouldReturn202() throws Exception {
        doNothing().when(notificationService).sendOrderConfirmation(any());

        OrderConfirmationRequest request = OrderConfirmationRequest.builder()
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .orderId(101L)
                .shippingAddress("123 Main St, Chennai")
                .paymentMethod("CREDIT_CARD")
                .totalAmount(new BigDecimal("599.00"))
                .items(List.of(
                        OrderConfirmationRequest.OrderItemDetail.builder()
                                .productName("Wireless Headphones")
                                .quantity(1)
                                .price(new BigDecimal("599.00"))
                                .build()
                ))
                .build();

        mockMvc.perform(post("/api/internal/notifications/order-confirmation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value("Order confirmation email queued for customer@example.com"));

        verify(notificationService).sendOrderConfirmation(any(OrderConfirmationRequest.class));
    }

    @Test
    void sendOrderConfirmation_MissingEmail_ShouldReturn400() throws Exception {
        OrderConfirmationRequest request = OrderConfirmationRequest.builder()
                .customerName("John Doe")
                .orderId(101L)
                .shippingAddress("123 Main St")
                .paymentMethod("CREDIT_CARD")
                .totalAmount(new BigDecimal("599.00"))
                .build();
        // customerEmail intentionally omitted

        mockMvc.perform(post("/api/internal/notifications/order-confirmation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.customerEmail").exists());
    }

    @Test
    void sendOrderConfirmation_InvalidEmail_ShouldReturn400() throws Exception {
        OrderConfirmationRequest request = OrderConfirmationRequest.builder()
                .customerEmail("not-an-email")
                .customerName("John Doe")
                .orderId(101L)
                .shippingAddress("123 Main St")
                .paymentMethod("CREDIT_CARD")
                .totalAmount(new BigDecimal("599.00"))
                .build();

        mockMvc.perform(post("/api/internal/notifications/order-confirmation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.customerEmail").exists());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT NOTIFICATION
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void sendPaymentNotification_SuccessPayment_ShouldReturn202() throws Exception {
        doNothing().when(notificationService).sendPaymentNotification(any());

        PaymentNotificationRequest request = PaymentNotificationRequest.builder()
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .orderId(101L)
                .amount(new BigDecimal("599.00"))
                .paymentStatus("SUCCESS")
                .paymentId("pay_razorpay_123")
                .build();

        mockMvc.perform(post("/api/internal/notifications/payment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value("Payment notification email queued for customer@example.com"));

        verify(notificationService).sendPaymentNotification(any(PaymentNotificationRequest.class));
    }

    @Test
    void sendPaymentNotification_FailedPayment_ShouldReturn202() throws Exception {
        doNothing().when(notificationService).sendPaymentNotification(any());

        PaymentNotificationRequest request = PaymentNotificationRequest.builder()
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .orderId(101L)
                .amount(new BigDecimal("599.00"))
                .paymentStatus("FAILED")
                .failureReason("Insufficient funds")
                .build();

        mockMvc.perform(post("/api/internal/notifications/payment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());
    }

    @Test
    void sendPaymentNotification_MissingStatus_ShouldReturn400() throws Exception {
        PaymentNotificationRequest request = PaymentNotificationRequest.builder()
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .orderId(101L)
                .amount(new BigDecimal("599.00"))
                .build();
        // paymentStatus omitted

        mockMvc.perform(post("/api/internal/notifications/payment")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.paymentStatus").exists());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ORDER STATUS UPDATE
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void sendOrderStatusUpdate_ShippedStatus_ShouldReturn202() throws Exception {
        doNothing().when(notificationService).sendOrderStatusUpdate(any());

        OrderStatusUpdateRequest request = OrderStatusUpdateRequest.builder()
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .orderId(101L)
                .newStatus("SHIPPED")
                .trackingNumber("TRACK123456")
                .build();

        mockMvc.perform(post("/api/internal/notifications/order-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value("Order status update email queued for customer@example.com"));

        verify(notificationService).sendOrderStatusUpdate(any(OrderStatusUpdateRequest.class));
    }

    @Test
    void sendOrderStatusUpdate_CancelledStatus_ShouldReturn202() throws Exception {
        doNothing().when(notificationService).sendOrderStatusUpdate(any());

        OrderStatusUpdateRequest request = OrderStatusUpdateRequest.builder()
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .orderId(101L)
                .newStatus("CANCELLED")
                .cancellationReason("Customer requested cancellation")
                .build();

        mockMvc.perform(post("/api/internal/notifications/order-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted());
    }

    @Test
    void sendOrderStatusUpdate_MissingStatus_ShouldReturn400() throws Exception {
        OrderStatusUpdateRequest request = OrderStatusUpdateRequest.builder()
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .orderId(101L)
                .build();
        // newStatus omitted

        mockMvc.perform(post("/api/internal/notifications/order-status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.newStatus").exists());
    }
}
