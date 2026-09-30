package com.ecommerce.payment.repository;

import com.ecommerce.payment.entity.VendorEarning;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface VendorEarningRepository extends JpaRepository<VendorEarning, Long> {

    /** All earnings for a vendor */
    List<VendorEarning> findByVendorId(Long vendorId);

    /** Earnings for a vendor filtered by payout status */
    List<VendorEarning> findByVendorIdAndPayoutStatus(Long vendorId, VendorEarning.PayoutStatus status);

    /** All earnings for a specific payout week */
    Page<VendorEarning> findByPayoutWeek(String payoutWeek, Pageable pageable);

    /** All earnings grouped by vendor (for admin payout summary) */
    @Query("SELECT ve.vendorId, SUM(ve.vendorEarning) as totalPending " +
           "FROM VendorEarning ve WHERE ve.payoutStatus = 'PENDING' " +
           "GROUP BY ve.vendorId ORDER BY totalPending DESC")
    List<Object[]> findPendingPayoutSummaryByVendor();

    /** Total pending payout for a single vendor */
    @Query("SELECT COALESCE(SUM(ve.vendorEarning), 0) FROM VendorEarning ve " +
           "WHERE ve.vendorId = :vendorId AND ve.payoutStatus = 'PENDING'")
    BigDecimal sumPendingEarningsByVendor(@Param("vendorId") Long vendorId);

    /** Total paid out to a vendor so far */
    @Query("SELECT COALESCE(SUM(ve.vendorEarning), 0) FROM VendorEarning ve " +
           "WHERE ve.vendorId = :vendorId AND ve.payoutStatus = 'PAID'")
    BigDecimal sumPaidEarningsByVendor(@Param("vendorId") Long vendorId);

    /** Check if order already has an earning record */
    boolean existsByOrderId(Long orderId);
}
