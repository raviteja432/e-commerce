package com.ecommerce.product.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * ProductReview entity mapping to the "product_reviews" table in database schema "ecom_product".
 * Stores ratings and written reviews left by customers on specific products.
 */
@Entity
@Table(name = "product_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The product being reviewed
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore
    private Product product;

    // The customer user ID who wrote this review (registered in auth-service)
    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Rating given, constrained to values between 1 and 5 stars
    @Column(nullable = false)
    private int rating;

    // A brief title/summary of the review
    @Column(length = 200)
    private String title;

    // The detailed text body of the review
    @Column(columnDefinition = "TEXT")
    private String body;

    // Timestamp when this review was created
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
