package com.ecommerce.cart.repository;

import com.ecommerce.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for CartItem database operations.
 */
@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    // Find a specific item by its parent cart ID and the product ID
    Optional<CartItem> findByCartIdAndProductId(Long cartId, Long productId);
}
