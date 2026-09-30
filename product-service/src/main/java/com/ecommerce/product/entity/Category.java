package com.ecommerce.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Category entity mapping to the "categories" table in database schema "ecom_product".
 * Represents high-level product categories (e.g. Electronics, Fashion).
 */
@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique display name of the category (e.g. "Home Appliances")
    @Column(nullable = false, unique = true, length = 100)
    private String name;

    // URL-friendly string derived from the name (e.g. "home-appliances")
    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    // Optional icon or thumbnail image URL associated with this category
    @Column(name = "icon_url", length = 500)
    private String iconUrl;

    // Indicates whether the category is visible in the public menu
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    // The timestamp when this category was created
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
