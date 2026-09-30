package com.ecommerce.product.dto.response;

import lombok.*;

import java.time.LocalDateTime;

/**
 * Data Transfer Object representing category details in responses.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryResponse {
    private Long id;
    private String name;
    private String slug;
    private String iconUrl;
    private boolean active;
    private LocalDateTime createdAt;
}
