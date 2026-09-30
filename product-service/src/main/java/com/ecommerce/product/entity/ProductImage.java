package com.ecommerce.product.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

/**
 * ProductImage entity mapping to the "product_images" table in database schema "ecom_product".
 * Tracks image attachments uploaded to S3 for products.
 */
@Entity
@Table(name = "product_images")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The product this image belongs to. 
    // JsonIgnore prevents infinite recursion during serialization.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnore
    private Product product;

    // The public S3 URL of the uploaded image file
    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    // Flag indicating whether this is the main banner image shown in product lists
    @Column(name = "is_primary")
    @Builder.Default
    private boolean isPrimary = false;

    // Numerical order to control the display sequence of images in the gallery grid
    @Column(name = "display_order")
    @Builder.Default
    private int displayOrder = 0;
}
