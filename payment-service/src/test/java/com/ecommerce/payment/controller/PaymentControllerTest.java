package com.ecommerce.payment.controller;

import com.ecommerce.payment.dto.CreatePaymentIntentRequest;
import com.ecommerce.payment.dto.CreatePaymentIntentResponse;
import com.ecommerce.payment.dto.PaymentStatusResponse;
import com.ecommerce.payment.exception.BadRequestException;
import com.ecommerce.payment.exception.ResourceNotFoundException;
import com.ecommerce.payment.service.PaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {PaymentController.class, InternalPaymentController.class})
class PaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PaymentService paymentService;

    // ─────────────────────────────────────────────────────────────────────────
    // INTERNAL — CREATE PAYMENT INTENT
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void createPaymentIntent_ValidRequest_ShouldReturn201() throws Exception {
        CreatePaymentIntentRequest request = CreatePaymentIntentRequest.builder()
                .orderId(1L)
                .amount(new BigDecimal("599.00"))
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .currency("inr")
                .build();

        CreatePaymentIntentResponse response = CreatePaymentIntentResponse.builder()
                .paymentIntentId("pi_3_mock123")
                .clientSecret("pi_3_mock123_secret_abc")
                .amount(new BigDecimal("599.00"))
                .currency("inr")
                .build();

        when(paymentService.createPaymentIntent(any(CreatePaymentIntentRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/internal/payments/create-intent")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.paymentIntentId").value("pi_3_mock123"))
                .andExpect(jsonPath("$.clientSecret").value("pi_3_mock123_secret_abc"))
                .andExpect(jsonPath("$.amount").value(599.00))
                .andExpect(jsonPath("$.currency").value("inr"));
    }

    @Test
    void createPaymentIntent_MissingOrderId_ShouldReturn400() throws Exception {
        CreatePaymentIntentRequest request = CreatePaymentIntentRequest.builder()
                .amount(new BigDecimal("599.00"))
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .build();
        // orderId intentionally omitted

        mockMvc.perform(post("/api/internal/payments/create-intent")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.orderId").exists());
    }

    @Test
    void createPaymentIntent_InvalidEmail_ShouldReturn400() throws Exception {
        CreatePaymentIntentRequest request = CreatePaymentIntentRequest.builder()
                .orderId(1L)
                .amount(new BigDecimal("599.00"))
                .customerEmail("not-valid-email")
                .customerName("John Doe")
                .build();

        mockMvc.perform(post("/api/internal/payments/create-intent")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.customerEmail").exists());
    }

    @Test
    void createPaymentIntent_StripeFailure_ShouldReturn400() throws Exception {
        CreatePaymentIntentRequest request = CreatePaymentIntentRequest.builder()
                .orderId(1L)
                .amount(new BigDecimal("599.00"))
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .build();

        when(paymentService.createPaymentIntent(any()))
                .thenThrow(new BadRequestException("Payment initialisation failed: No such customer"));

        mockMvc.perform(post("/api/internal/payments/create-intent")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Payment initialisation failed: No such customer"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // WEBHOOK
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void handleWebhook_ValidEvent_ShouldReturn200() throws Exception {
        doNothing().when(paymentService).handleWebhook(anyString(), anyString());

        mockMvc.perform(post("/api/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Stripe-Signature", "t=1234,v1=abc123")
                        .content("{\"type\":\"payment_intent.succeeded\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Webhook processed"));
    }

    @Test
    void handleWebhook_InvalidSignature_ShouldReturn400() throws Exception {
        doThrow(new BadRequestException("Invalid webhook signature"))
                .when(paymentService).handleWebhook(anyString(), anyString());

        mockMvc.perform(post("/api/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Stripe-Signature", "invalid_sig")
                        .content("{\"type\":\"payment_intent.succeeded\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid webhook signature"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT STATUS
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void getPaymentStatus_ExistingOrder_ShouldReturn200() throws Exception {
        PaymentStatusResponse response = PaymentStatusResponse.builder()
                .orderId(1L)
                .stripePaymentIntentId("pi_3_mock123")
                .amount(new BigDecimal("599.00"))
                .currency("inr")
                .status("SUCCESS")
                .build();

        when(paymentService.getPaymentStatus(1L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/status/1")
                        .header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderId").value(1L))
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.stripePaymentIntentId").value("pi_3_mock123"));
    }

    @Test
    void getPaymentStatus_NonExistentOrder_ShouldReturn404() throws Exception {
        when(paymentService.getPaymentStatus(999L))
                .thenThrow(new ResourceNotFoundException("No payment record found for orderId: 999"));

        mockMvc.perform(get("/api/payments/status/999")
                        .header("X-User-Id", 1L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("No payment record found for orderId: 999"));
    }

    @Test
    void getPaymentStatus_PendingPayment_ShouldReturnPending() throws Exception {
        PaymentStatusResponse response = PaymentStatusResponse.builder()
                .orderId(2L)
                .stripePaymentIntentId("pi_pending_456")
                .amount(new BigDecimal("1200.00"))
                .currency("inr")
                .status("PENDING")
                .build();

        when(paymentService.getPaymentStatus(2L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/status/2")
                        .header("X-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }
}
