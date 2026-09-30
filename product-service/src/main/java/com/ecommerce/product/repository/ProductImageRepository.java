package com.ecommerce.product.repository;

import com.ecommerce.product.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for ProductImage database operations.
 */
@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
}
