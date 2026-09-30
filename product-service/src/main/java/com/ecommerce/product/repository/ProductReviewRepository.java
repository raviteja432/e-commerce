package com.ecommerce.product.repository;

import com.ecommerce.product.entity.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for ProductReview database operations.
 */
@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    // Retrieve paginated reviews left on a specific product
    Page<ProductReview> findByProductId(Long productId, Pageable pageable);

    // Retrieve all reviews left on a specific product (useful to calculate average rating)
    List<ProductReview> findByProductId(Long productId);

    // Count total reviews for a product without loading all review rows into memory
    long countByProductId(Long productId);

    // Check if a customer user has already left a review on a product
    boolean existsByProductIdAndUserId(Long productId, Long userId);
}
