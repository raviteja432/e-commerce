package com.ecommerce.order.repository;

import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Data access repository for Order entities.
 */
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    /**
     * Finds all orders placed by a specific user, sorted from newest to oldest.
     */
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Finds all distinct orders containing products from a specific vendor, sorted newest first.
     */
    @Query("SELECT DISTINCT o FROM Order o JOIN o.items i WHERE i.vendorId = :vendorId ORDER BY o.createdAt DESC")
    List<Order> findOrdersByVendorIdOrderByCreatedAtDesc(@Param("vendorId") Long vendorId);

    /**
     * Counts the total number of distinct orders containing products from a specific vendor.
     */
    @Query("SELECT COUNT(DISTINCT o.id) FROM Order o JOIN o.items i WHERE i.vendorId = :vendorId")
    long countTotalOrdersByVendorId(@Param("vendorId") Long vendorId);

    /**
     * Counts the number of distinct orders with a specific status containing products from a specific vendor.
     */
    @Query("SELECT COUNT(DISTINCT o.id) FROM Order o JOIN o.items i WHERE i.vendorId = :vendorId AND o.status = :status")
    long countOrdersByVendorIdAndStatus(@Param("vendorId") Long vendorId, @Param("status") OrderStatus status);

    /**
     * Finds IDs of all orders that are not PENDING (i.e. PROCESSING, SHIPPED, DELIVERED, etc.).
     */
    @Query("SELECT o.id FROM Order o WHERE o.status != com.ecommerce.order.entity.OrderStatus.PENDING")
    List<Long> findNonPendingOrderIds();
}
