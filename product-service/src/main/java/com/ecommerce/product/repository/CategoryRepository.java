package com.ecommerce.product.repository;

import com.ecommerce.product.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Category database operations.
 */
@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    // Retrieve active categories for public menus
    List<Category> findByActiveTrue();

    // Look up category details using its URL-friendly slug
    Optional<Category> findBySlug(String slug);

    // Check existence by name to prevent duplicate creation
    boolean existsByName(String name);

    // Check existence by slug to prevent slug collisions
    boolean existsBySlug(String slug);
}
