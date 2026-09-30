package com.ecommerce.cart.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Cart entity — represents a single user's shopping cart.
 * Each customer has exactly ONE cart (unique on user_id).
 * The cart persists between sessions; items stay until the customer removes them or places an order.
 */
@Entity
@Table(name = "carts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Ties this cart to a user from the auth-service. One cart per user.
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    // All items inside this cart
    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CartItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Helper to add an item and maintain the bidirectional link
    public void addItem(CartItem item) {
        items.add(item);
        item.setCart(this);
    }

    // Helper to remove an item
    public void removeItem(CartItem item) {
        items.remove(item);
        item.setCart(null);
    }
}
