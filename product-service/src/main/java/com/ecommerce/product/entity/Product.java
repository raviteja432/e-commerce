package com.ecommerce.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Product entity mapping to the "products" table in database schema "ecom_product".
 * Stores product metadata, pricing, inventory stock, and references to its owner vendor.
 */
@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The ID of the vendor who owns and sells this product (stored in vendor-service)
    @Column(name = "vendor_id", nullable = false)
    private Long vendorId;

    // Display title/name of the product
    @Column(nullable = false, length = 255)
    private String name;

    // URL-friendly unique slug derived from the product name
    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    // Short summary description shown in lists and search results
    @Column(name = "short_description", length = 500)
    private String shortDescription;

    // Full detailed description/specification of the product
    @Column(columnDefinition = "TEXT")
    private String description;

    // Relationship to the Category entity
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    // Main selling price of the product
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    // Reference/original price before discount (crossed out in UI if present)
    @Column(name = "compare_at_price", precision = 12, scale = 2)
    private BigDecimal compareAtPrice;

    // Current inventory level available for purchase
    @Column(name = "stock_quantity", nullable = false)
    @Builder.Default
    private int stockQuantity = 0;

    // Stock Keeping Unit identifier
    @Column(length = 100)
    private String sku;

    // Visibility toggle flag. False soft-deletes the product from listings
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    // Flag indicating whether to showcase this product in the Landing Page's featured section
    @Column(nullable = false)
    @Builder.Default
    private boolean featured = false;

    // List of S3 image URLs associated with the product
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ProductImage> images = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Helper method to add images and sync the bidirectional association
    public void addImage(ProductImage image) {
        images.add(image);
        image.setProduct(this);
    }

    // Helper method to remove images and break the association
    public void removeImage(ProductImage image) {
        images.remove(image);
        image.setProduct(null);
    }
}
