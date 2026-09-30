package com.ecommerce.cart.dto.response;

import lombok.*;

/**
 * Simple message response for operations that don't need to return data
 * (e.g. remove item, clear cart).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class MessageResponse {
    private String message;
}
