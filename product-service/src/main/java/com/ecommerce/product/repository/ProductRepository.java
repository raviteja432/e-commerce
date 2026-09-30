package com.ecommerce.product.repository;

import com.ecommerce.product.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository interface for Product database operations.
 * Extends JpaSpecificationExecutor to support dynamic filter/search criteria queries.
 */
@Repository
public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    // Retrieve active products by unique URL-friendly slug
    Optional<Product> findBySlugAndActiveTrue(String slug);

    // Retrieve any product by its slug (useful for administrative pages)
    Optional<Product> findBySlug(String slug);

    // Check existence by slug to prevent collisions
    boolean existsBySlug(String slug);

    // Retrieve a paginated list of products owned by a specific vendor (vendor portal view)
    Page<Product> findByVendorId(Long vendorId, Pageable pageable);

    // Count the total number of products listed by a specific vendor (used for statistics)
    long countByVendorId(Long vendorId);
}
