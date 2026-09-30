package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.OrderRequest;
import com.ecommerce.order.dto.response.MessageResponse;
import com.ecommerce.order.dto.response.OrderItemResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.exception.BadRequestException;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.service.OrderService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {OrderController.class, InternalOrderController.class})
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private OrderService orderService;

    private OrderResponse buildSampleOrderResponse(Long orderId, Long userId) {
        OrderItemResponse item = OrderItemResponse.builder()
                .id(1L)
                .productId(101L)
                .productName("Test Product")
                .productImage("https://example.com/image.jpg")
                .price(new BigDecimal("100.00"))
                .quantity(2)
                .vendorId(10L)
                .build();

        return OrderResponse.builder()
                .id(orderId)
                .userId(userId)
                .shippingAddress("123 Main St, Chennai")
                .paymentMethod("CREDIT_CARD")
                .status("PENDING")
                .totalAmount(new BigDecimal("200.00"))
                .items(List.of(item))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void createOrder_ShouldReturn201WithOrderResponse() throws Exception {
        Long userId = 1L;
        OrderRequest request = OrderRequest.builder()
                .shippingAddress("123 Main St, Chennai")
                .paymentMethod("CREDIT_CARD")
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .build();
        OrderResponse response = buildSampleOrderResponse(1L, userId);

        when(orderService.createOrder(eq(userId), any(OrderRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/orders")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.totalAmount").value(200.00))
                .andExpect(jsonPath("$.items.length()").value(1));
    }

    @Test
    void createOrder_WithEmptyCart_ShouldReturn400() throws Exception {
        Long userId = 1L;
        OrderRequest request = OrderRequest.builder()
                .shippingAddress("123 Main St")
                .paymentMethod("CREDIT_CARD")
                .customerEmail("customer@example.com")
                .customerName("John Doe")
                .build();

        when(orderService.createOrder(eq(userId), any(OrderRequest.class)))
                .thenThrow(new BadRequestException("Your cart is empty. Please add items before placing an order."));

        mockMvc.perform(post("/api/orders")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Your cart is empty. Please add items before placing an order."));
    }

    @Test
    void createOrder_MissingFields_ShouldReturn400() throws Exception {
        Long userId = 1L;
        OrderRequest request = OrderRequest.builder()
                .shippingAddress("")
                .paymentMethod("")
                .customerEmail("")
                .customerName("")
                .build();

        mockMvc.perform(post("/api/orders")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getMyOrders_ShouldReturnOrderList() throws Exception {
        Long userId = 1L;
        List<OrderResponse> orders = List.of(
                buildSampleOrderResponse(1L, userId),
                buildSampleOrderResponse(2L, userId)
        );

        when(orderService.getOrdersForUser(userId)).thenReturn(orders);

        mockMvc.perform(get("/api/orders")
                        .header("X-User-Id", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(1L))
                .andExpect(jsonPath("$[1].id").value(2L));
    }

    @Test
    void getMyOrders_WhenNoOrders_ShouldReturnEmptyList() throws Exception {
        Long userId = 1L;
        when(orderService.getOrdersForUser(userId)).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/orders")
                        .header("X-User-Id", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void getOrderDetails_ShouldReturnOrderResponse() throws Exception {
        Long userId = 1L;
        Long orderId = 10L;
        OrderResponse response = buildSampleOrderResponse(orderId, userId);

        when(orderService.getOrderDetails(userId, orderId)).thenReturn(response);

        mockMvc.perform(get("/api/orders/{id}", orderId)
                        .header("X-User-Id", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orderId));
    }

    @Test
    void getOrderDetails_NotFound_ShouldReturn404() throws Exception {
        Long userId = 1L;
        Long orderId = 999L;

        when(orderService.getOrderDetails(userId, orderId))
                .thenThrow(new ResourceNotFoundException("Order not found: " + orderId));

        mockMvc.perform(get("/api/orders/{id}", orderId)
                        .header("X-User-Id", userId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Order not found: " + orderId));
    }

    @Test
    void getOrderDetails_WrongOwner_ShouldReturn400() throws Exception {
        Long userId = 1L;
        Long orderId = 5L;

        when(orderService.getOrderDetails(userId, orderId))
                .thenThrow(new BadRequestException("You do not have permission to view this order"));

        mockMvc.perform(get("/api/orders/{id}", orderId)
                        .header("X-User-Id", userId))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("You do not have permission to view this order"));
    }

    @Test
    void getVendorOrderStats_ShouldReturnStats() throws Exception {
        Long vendorId = 10L;
        Map<String, Long> stats = Map.of("totalOrders", 50L, "pendingOrders", 5L);

        when(orderService.getVendorOrderStats(vendorId)).thenReturn(stats);

        mockMvc.perform(get("/api/internal/orders/vendor/{vendorId}/stats", vendorId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOrders").value(50L))
                .andExpect(jsonPath("$.pendingOrders").value(5L));
    }

    @Test
    void updateOrderStatus_ShouldReturn200() throws Exception {
        doNothing().when(orderService).updateOrderStatus(1L, "PROCESSING");

        mockMvc.perform(put("/api/internal/orders/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PROCESSING\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Order status updated to PROCESSING"));

        verify(orderService).updateOrderStatus(1L, "PROCESSING");
    }
}
