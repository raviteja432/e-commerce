package com.ecommerce.auth.repository;

import com.ecommerce.auth.entity.CustomerAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerAddressRepository extends JpaRepository<CustomerAddress, Long> {

    List<CustomerAddress> findByUserId(Long userId);

    Optional<CustomerAddress> findByIdAndUserId(Long id, Long userId);

    @Modifying
    @Query("UPDATE CustomerAddress a SET a.isDefault = false WHERE a.user.id = :userId")
    void clearDefaultForUser(Long userId);

    long countByUserId(Long userId);
}
