package com.ecommerce.cart.controller;

import com.ecommerce.cart.dto.request.AddToCartRequest;
import com.ecommerce.cart.dto.request.UpdateCartItemRequest;
import com.ecommerce.cart.dto.response.CartResponse;
import com.ecommerce.cart.dto.response.InternalCartResponse;
import com.ecommerce.cart.dto.response.MessageResponse;
import com.ecommerce.cart.service.CartService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = {CartController.class, InternalCartController.class})
class CartControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private CartService cartService;

    @Test
    void getCart_ShouldReturnCartResponse() throws Exception {
        Long userId = 1L;
        CartResponse cartResponse = CartResponse.builder()
                .cartId(1L)
                .userId(userId)
                .items(Collections.emptyList())
                .subtotal(BigDecimal.ZERO)
                .itemCount(0)
                .build();

        when(cartService.getCart(userId)).thenReturn(cartResponse);

        mockMvc.perform(get("/api/cart")
                        .header("X-User-Id", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cartId").value(1L))
                .andExpect(jsonPath("$.userId").value(userId))
                .andExpect(jsonPath("$.itemCount").value(0));
    }

    @Test
    void addToCart_ShouldReturnUpdatedCart() throws Exception {
        Long userId = 1L;
        AddToCartRequest request = new AddToCartRequest(101L, 2);
        CartResponse cartResponse = CartResponse.builder()
                .cartId(1L)
                .userId(userId)
                .items(Collections.emptyList())
                .subtotal(BigDecimal.ZERO)
                .itemCount(1)
                .build();

        when(cartService.addToCart(eq(userId), any(AddToCartRequest.class))).thenReturn(cartResponse);

        mockMvc.perform(post("/api/cart")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCount").value(1));
    }

    @Test
    void updateCartItem_ShouldReturnUpdatedCart() throws Exception {
        Long userId = 1L;
        Long itemId = 5L;
        UpdateCartItemRequest request = new UpdateCartItemRequest(3);
        CartResponse cartResponse = CartResponse.builder()
                .cartId(1L)
                .userId(userId)
                .items(Collections.emptyList())
                .subtotal(BigDecimal.ZERO)
                .itemCount(1)
                .build();

        when(cartService.updateCartItem(eq(userId), eq(itemId), any(UpdateCartItemRequest.class))).thenReturn(cartResponse);

        mockMvc.perform(put("/api/cart/items/{itemId}", itemId)
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCount").value(1));
    }

    @Test
    void removeItem_ShouldReturnMessageResponse() throws Exception {
        Long userId = 1L;
        Long itemId = 5L;
        MessageResponse messageResponse = new MessageResponse("Item removed from cart");

        when(cartService.removeItem(userId, itemId)).thenReturn(messageResponse);

        mockMvc.perform(delete("/api/cart/items/{itemId}", itemId)
                        .header("X-User-Id", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Item removed from cart"));
    }

    @Test
    void clearCart_ShouldReturnMessageResponse() throws Exception {
        Long userId = 1L;
        MessageResponse messageResponse = new MessageResponse("Cart cleared successfully");

        when(cartService.clearCart(userId)).thenReturn(messageResponse);

        mockMvc.perform(delete("/api/cart")
                        .header("X-User-Id", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Cart cleared successfully"));
    }

    @Test
    void getCartInternal_ShouldReturnInternalCartResponse() throws Exception {
        Long userId = 1L;
        InternalCartResponse internalCartResponse = InternalCartResponse.builder()
                .cartId(1L)
                .userId(userId)
                .items(Collections.emptyList())
                .total(BigDecimal.ZERO)
                .build();

        when(cartService.getCartInternal(userId)).thenReturn(internalCartResponse);

        mockMvc.perform(get("/api/internal/cart/{userId}", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cartId").value(1L))
                .andExpect(jsonPath("$.userId").value(userId));
    }

    @Test
    void clearCartInternal_ShouldReturnMessageResponse() throws Exception {
        Long userId = 1L;
        MessageResponse messageResponse = new MessageResponse("Cart cleared successfully");

        when(cartService.clearCart(userId)).thenReturn(messageResponse);

        mockMvc.perform(delete("/api/internal/cart/{userId}", userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Cart cleared successfully"));
    }
}
