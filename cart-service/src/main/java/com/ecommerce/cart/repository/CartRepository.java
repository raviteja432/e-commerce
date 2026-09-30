package com.ecommerce.cart.repository;

import com.ecommerce.cart.entity.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for Cart database operations.
 */
@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {

    // Find a cart by the owner's user ID (each user has at most one cart)
    Optional<Cart> findByUserId(Long userId);
}
