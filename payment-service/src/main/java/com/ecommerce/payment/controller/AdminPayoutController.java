package com.ecommerce.payment.controller;

import com.ecommerce.payment.entity.VendorEarning;
import com.ecommerce.payment.repository.VendorEarningRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for Admin Payout Operations & Vendor Earnings.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class AdminPayoutController {

    private final VendorEarningRepository vendorEarningRepository;
    private final com.ecommerce.payment.service.PaymentService paymentService;
    private final RestTemplate restTemplate;

    @Value("${vendor.service.url:http://localhost:8082}")
    private String vendorServiceUrl;

    @Value("${order.service.url:http://localhost:8085}")
    private String orderServiceUrl;

    @Value("${auth.service.url:http://localhost:8081}")
    private String authServiceUrl;

    @Value("${notification.service.url:http://localhost:8087}")
    private String notificationServiceUrl;

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    /**
     * Admin: get payout summary for all vendors who have pending earnings.
     * Returns vendor ID, store name, bank details, and total pending amount.
     */
    @GetMapping("/api/admin/payouts/summary")
    public ResponseEntity<List<Map<String, Object>>> getPendingPayoutSummary() {
        // Sync earnings for all non-pending orders from order-service
        try {
            String nonPendingUrl = orderServiceUrl + "/api/internal/orders/non-pending-ids";
            ResponseEntity<List> response = restTemplate.getForEntity(nonPendingUrl, List.class);
            if (response.getBody() != null) {
                for (Object item : response.getBody()) {
                    Long orderId = ((Number) item).longValue();
                    paymentService.recordVendorEarningsForOrder(orderId);
                }
            }
        } catch (Exception e) {
            log.warn("Could not sync non-pending orders for payout summary: {}", e.getMessage());
        }

        List<Object[]> results = vendorEarningRepository.findPendingPayoutSummaryByVendor();
        List<Map<String, Object>> summaryList = new ArrayList<>();

        for (Object[] row : results) {
            Long vendorId = ((Number) row[0]).longValue();
            BigDecimal totalPending = (BigDecimal) row[1];

            Map<String, Object> item = new HashMap<>();
            item.put("vendorId", vendorId);
            item.put("totalPending", totalPending);

            // Fetch vendor info (including decrypted bank account) from vendor-service
            try {
                String vendorUrl = vendorServiceUrl + "/api/admin/vendors/" + vendorId;
                ResponseEntity<Map> response = restTemplate.getForEntity(vendorUrl, Map.class);
                if (response.getBody() != null) {
                    Map<String, Object> vDetails = response.getBody();
                    item.put("storeName", vDetails.get("storeName"));
                    item.put("businessEmail", vDetails.get("businessEmail"));
                    item.put("businessPhone", vDetails.get("businessPhone"));
                    item.put("panNumber", vDetails.get("panNumber"));
                    item.put("bankAccountName", vDetails.get("bankAccountName"));
                    item.put("bankAccountNumber", vDetails.get("bankAccountNumber"));
                    item.put("bankIfscCode", vDetails.get("bankIfscCode"));
                }
            } catch (Exception e) {
                log.error("Failed to fetch vendor detail for vendorId={}: {}", vendorId, e.getMessage());
                item.put("storeName", "Vendor #" + vendorId);
            }

            summaryList.add(item);
        }

        return ResponseEntity.ok(summaryList);
    }

    /**
     * Admin: view detailed earnings list for a specific vendor.
     */
    @GetMapping("/api/admin/payouts/vendor/{vendorId}")
    public ResponseEntity<List<VendorEarning>> getVendorEarningDetails(@PathVariable Long vendorId) {
        List<VendorEarning> earnings = vendorEarningRepository.findByVendorId(vendorId);
        return ResponseEntity.ok(earnings);
    }

    /**
     * Admin: mark all pending earnings for a vendor as PAID after bank transfer.
     * Also sends the vendor a payout receipt email via notification-service.
     */
    @PatchMapping("/api/admin/payouts/vendor/{vendorId}/mark-paid")
    public ResponseEntity<Map<String, Object>> markVendorPaid(
            @PathVariable Long vendorId,
            @RequestBody(required = false) Map<String, String> body) {

        String notes = (body != null && body.containsKey("notes")) ? body.get("notes") : "Weekly Payout Transferred";
        List<VendorEarning> pendingEarnings = vendorEarningRepository.findByVendorIdAndPayoutStatus(vendorId, VendorEarning.PayoutStatus.PENDING);

        BigDecimal totalPaid = BigDecimal.ZERO;
        for (VendorEarning earning : pendingEarnings) {
            earning.setPayoutStatus(VendorEarning.PayoutStatus.PAID);
            earning.setPaidAt(LocalDateTime.now());
            earning.setAdminNotes(notes);
            totalPaid = totalPaid.add(earning.getVendorEarning());
        }

        vendorEarningRepository.saveAll(pendingEarnings);
        log.info("Marked {} earnings records as PAID for vendorId={}, totalPaid={}", pendingEarnings.size(), vendorId, totalPaid);

        return ResponseEntity.ok(Map.of(
                "message", "Payout of ₹" + totalPaid + " marked as PAID for vendor " + vendorId,
                "count", pendingEarnings.size(),
                "totalPaid", totalPaid
        ));
    }

    /**
     * Admin: initiate a real bank transfer for a vendor payout.
     * Marks all PENDING earnings as PAID and sends the vendor a payout receipt email
     * containing the UTR/reference number, transfer method, and bank details.
     */
    @PostMapping("/api/admin/payouts/vendor/{vendorId}/transfer")
    public ResponseEntity<Map<String, Object>> transferVendorPayout(
            @PathVariable Long vendorId,
            @RequestBody Map<String, String> body) {

        String transferMethod  = body.getOrDefault("transferMethod",  "NEFT");
        String referenceNumber = body.getOrDefault("referenceNumber", "N/A");
        String notes           = body.getOrDefault("notes", "Weekly payout transferred via " + transferMethod);

        // 1. Mark all pending earnings as PAID
        List<VendorEarning> pendingEarnings = vendorEarningRepository
                .findByVendorIdAndPayoutStatus(vendorId, VendorEarning.PayoutStatus.PENDING);

        if (pendingEarnings.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No pending earnings found for vendor " + vendorId));
        }

        BigDecimal totalVendorEarning = BigDecimal.ZERO;
        BigDecimal totalOrderAmount   = BigDecimal.ZERO;
        for (VendorEarning earning : pendingEarnings) {
            earning.setPayoutStatus(VendorEarning.PayoutStatus.PAID);
            earning.setPaidAt(LocalDateTime.now());
            earning.setAdminNotes(notes + " | UTR: " + referenceNumber);
            totalVendorEarning = totalVendorEarning.add(earning.getVendorEarning());
            totalOrderAmount   = totalOrderAmount.add(earning.getTotalAmount());
        }
        vendorEarningRepository.saveAll(pendingEarnings);

        // 2. Calculate breakdown
        BigDecimal platformFeeAmount = totalOrderAmount.subtract(totalVendorEarning);
        String formattedAmount    = "₹" + totalVendorEarning.setScale(2, RoundingMode.HALF_UP);
        String formattedGross     = "₹" + totalOrderAmount.setScale(2, RoundingMode.HALF_UP);
        String formattedPlatform  = "₹" + platformFeeAmount.setScale(2, RoundingMode.HALF_UP);
        String transferDate       = LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy"));

        log.info("Transfer initiated for vendorId={}, amount={}, method={}, ref={}",
                vendorId, formattedAmount, transferMethod, referenceNumber);

        // 3. Fetch vendor details from vendor-service to get email
        String vendorEmail    = null;
        String vendorName     = "Vendor";
        String storeName      = "Store";
        String bankAccountNum = "";
        try {
            String vendorUrl = vendorServiceUrl + "/api/admin/vendors/" + vendorId;
            ResponseEntity<Map> vResponse = restTemplate.getForEntity(vendorUrl, Map.class);
            if (vResponse.getBody() != null) {
                Map<String, Object> vDetails = vResponse.getBody();
                storeName      = (String) vDetails.getOrDefault("storeName", "Store");
                bankAccountNum = (String) vDetails.getOrDefault("bankAccountNumber", "");
                // Fetch vendor's user email from auth-service via vendor userId
                Object userId = vDetails.get("userId");
                if (userId != null) {
                    try {
                        String authUrl = authServiceUrl + "/api/internal/users/" + userId;
                        ResponseEntity<Map> uResponse = restTemplate.getForEntity(authUrl, Map.class);
                        if (uResponse.getBody() != null) {
                            vendorEmail = (String) uResponse.getBody().get("email");
                            vendorName  = (String) uResponse.getBody().getOrDefault("name", storeName);
                        }
                    } catch (Exception ex) {
                        log.warn("Could not fetch user email for vendor userId={}: {}", userId, ex.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch vendor details for vendorId={}: {}", vendorId, e.getMessage());
        }

        // 4. Mask account number (show last 4 digits only)
        String maskedAccount = bankAccountNum.length() > 4
                ? "•••• •••• " + bankAccountNum.substring(bankAccountNum.length() - 4)
                : bankAccountNum.isEmpty() ? "N/A" : bankAccountNum;

        // 5. Send payout receipt email to vendor if email is available
        if (vendorEmail != null && !vendorEmail.isBlank()) {
            try {
                Map<String, Object> payoutEmailPayload = new HashMap<>();
                payoutEmailPayload.put("vendorEmail",         vendorEmail);
                payoutEmailPayload.put("vendorName",          vendorName);
                payoutEmailPayload.put("storeName",           storeName);
                payoutEmailPayload.put("amount",              formattedAmount);
                payoutEmailPayload.put("grossAmount",         formattedGross);
                payoutEmailPayload.put("platformFee",         formattedPlatform);
                payoutEmailPayload.put("transferMethod",      transferMethod);
                payoutEmailPayload.put("referenceNumber",     referenceNumber);
                payoutEmailPayload.put("transferDate",        transferDate);
                payoutEmailPayload.put("maskedAccountNumber", maskedAccount);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                HttpEntity<Map<String, Object>> emailRequest = new HttpEntity<>(payoutEmailPayload, headers);

                restTemplate.postForEntity(
                        notificationServiceUrl + "/api/internal/notifications/vendor-payout",
                        emailRequest,
                        Map.class
                );
                log.info("Vendor payout email dispatched to {} for store '{}'", vendorEmail, storeName);
            } catch (Exception e) {
                log.error("Failed to send payout email to vendor {}: {}", vendorId, e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Transfer of " + formattedAmount + " processed and vendor notified.",
                "totalPaid", totalVendorEarning,
                "referenceNumber", referenceNumber,
                "transferMethod", transferMethod
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STRIPE CONNECT PAYOUT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Admin: transfer vendor payout via Stripe Connect.
     *
     * Flow:
     *  1. Fetch vendor details (bank account, IFSC, stripeAccountId) from vendor-service.
     *  2. If the vendor has no Stripe Connected Account yet, create one (Custom type)
     *     and attach their bank account as an external account.
     *     Save the new stripeAccountId back to vendor-service for reuse.
     *  3. Use Stripe Transfer API to move vendorEarning from the platform balance
     *     to the vendor's Connected Account.
     *  4. Mark all PENDING earnings as PAID and send the vendor a payout receipt email.
     */
    @PostMapping("/api/admin/payouts/vendor/{vendorId}/stripe-transfer")
    public ResponseEntity<Map<String, Object>> stripeTransferVendorPayout(
            @PathVariable Long vendorId) {

        // ── 1. Fetch vendor details ──────────────────────────────────────────
        Map<String, Object> vDetails;
        try {
            String vendorUrl = vendorServiceUrl + "/api/admin/vendors/" + vendorId;
            ResponseEntity<Map> vResponse = restTemplate.getForEntity(vendorUrl, Map.class);
            vDetails = vResponse.getBody();
            if (vDetails == null) throw new RuntimeException("Empty response from vendor-service");
        } catch (Exception e) {
            log.error("Could not fetch vendor details for vendorId={}: {}", vendorId, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", "Could not retrieve vendor details: " + e.getMessage()));
        }

        String bankAccountNumber = (String) vDetails.getOrDefault("bankAccountNumber", "");
        String bankIfscCode      = (String) vDetails.getOrDefault("bankIfscCode", "");
        String bankAccountName   = (String) vDetails.getOrDefault("bankAccountName", "");
        String storeName         = (String) vDetails.getOrDefault("storeName", "Vendor");
        String existingStripeAccId = (String) vDetails.get("stripeAccountId");

        if (bankAccountNumber == null || bankAccountNumber.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vendor has no bank account number on file."));
        }
        if (bankIfscCode == null || bankIfscCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vendor has no IFSC code on file."));
        }

        // ── 2. Check for pending earnings ────────────────────────────────────
        List<VendorEarning> pendingEarnings = vendorEarningRepository
                .findByVendorIdAndPayoutStatus(vendorId, VendorEarning.PayoutStatus.PENDING);
        if (pendingEarnings.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No pending earnings for vendor " + vendorId));
        }
        BigDecimal totalVendorEarning = pendingEarnings.stream()
                .map(VendorEarning::getVendorEarning)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalOrderAmount = pendingEarnings.stream()
                .map(VendorEarning::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Stripe amounts are in smallest unit. For INR: multiply by 100 (paise).
        long amountInPaise = totalVendorEarning.multiply(BigDecimal.valueOf(100)).longValue();

        // ── 3. Stripe SDK operations ─────────────────────────────────────────
        com.stripe.Stripe.apiKey = stripeSecretKey;
        String stripeAccountId = existingStripeAccId;
        String stripeTransferId;

        try {
            // 3a. Create a Stripe Custom Connected Account if this vendor doesn't have one yet
            if (stripeAccountId == null || stripeAccountId.isBlank()) {
                log.info("Creating Stripe Custom Connected Account for vendorId={}, store='{}'", vendorId, storeName);

                // Fetch vendor's user email for Stripe account
                String vendorEmail = (String) vDetails.getOrDefault("businessEmail", "");
                if (vendorEmail == null || vendorEmail.isBlank()) {
                    // Try to get email from auth-service via userId
                    try {
                        Object userIdObj = vDetails.get("userId");
                        if (userIdObj != null) {
                            String authUrl = authServiceUrl + "/api/internal/users/" + userIdObj;
                            ResponseEntity<Map> uResp = restTemplate.getForEntity(authUrl, Map.class);
                            if (uResp.getBody() != null) vendorEmail = (String) uResp.getBody().get("email");
                        }
                    } catch (Exception ex) { log.warn("Could not get vendor email: {}", ex.getMessage()); }
                }

                com.stripe.param.AccountCreateParams accountParams = com.stripe.param.AccountCreateParams.builder()
                        .setType(com.stripe.param.AccountCreateParams.Type.CUSTOM)
                        .setCountry("IN")
                        .setEmail(vendorEmail != null && !vendorEmail.isBlank() ? vendorEmail : null)
                        .setCapabilities(com.stripe.param.AccountCreateParams.Capabilities.builder()
                                .setTransfers(com.stripe.param.AccountCreateParams.Capabilities.Transfers.builder()
                                        .setRequested(true).build())
                                .build())
                        .setBusinessType(com.stripe.param.AccountCreateParams.BusinessType.INDIVIDUAL)
                        .putMetadata("vendorId", vendorId.toString())
                        .putMetadata("storeName", storeName)
                        .build();

                com.stripe.model.Account connectedAccount = com.stripe.model.Account.create(accountParams);
                stripeAccountId = connectedAccount.getId();
                log.info("Stripe Connected Account created: {} for vendorId={}", stripeAccountId, vendorId);

                // 3b. Attach bank account as external account on the connected account
                // IFSC in India is the routing number equivalent
                com.stripe.param.TokenCreateParams tokenParams = com.stripe.param.TokenCreateParams.builder()
                        .setBankAccount(com.stripe.param.TokenCreateParams.BankAccount.builder()
                                .setCountry("IN")
                                .setCurrency("inr")
                                .setAccountNumber(bankAccountNumber)
                                .setRoutingNumber(bankIfscCode)
                                .setAccountHolderName(bankAccountName != null && !bankAccountName.isBlank() ? bankAccountName : storeName)
                                .setAccountHolderType(com.stripe.param.TokenCreateParams.BankAccount.AccountHolderType.INDIVIDUAL)
                                .build())
                        .build();

                com.stripe.model.Token bankToken = com.stripe.model.Token.create(tokenParams);

                com.stripe.model.Account acctForBankAdd = com.stripe.model.Account.retrieve(stripeAccountId);
                acctForBankAdd.getExternalAccounts().create(Map.of("external_account", bankToken.getId()));
                log.info("Bank account attached to Stripe Connected Account {} for vendorId={}", stripeAccountId, vendorId);

                // 3c. Save the new stripeAccountId back to vendor-service
                final String finalStripeAccId = stripeAccountId;
                try {
                    HttpHeaders saveHeaders = new HttpHeaders();
                    saveHeaders.setContentType(MediaType.APPLICATION_JSON);
                    HttpEntity<Map<String, String>> saveReq = new HttpEntity<>(
                            Map.of("stripeAccountId", finalStripeAccId), saveHeaders);
                    restTemplate.patchForObject(
                            vendorServiceUrl + "/api/admin/vendors/" + vendorId + "/stripe-account",
                            saveReq, Void.class);
                    log.info("Saved stripeAccountId={} for vendorId={}", finalStripeAccId, vendorId);
                } catch (Exception ex) {
                    log.error("Failed to save stripeAccountId for vendorId={}: {}", vendorId, ex.getMessage());
                }
            }

            // 3d. Stripe Transfer: move funds from platform balance → vendor Connected Account
            com.stripe.param.TransferCreateParams transferParams = com.stripe.param.TransferCreateParams.builder()
                    .setAmount(amountInPaise)
                    .setCurrency("inr")
                    .setDestination(stripeAccountId)
                    .setDescription("Weekly vendor payout for store: " + storeName)
                    .putMetadata("vendorId", vendorId.toString())
                    .putMetadata("storeName", storeName)
                    .putMetadata("payoutWeek", pendingEarnings.get(0).getPayoutWeek() != null
                            ? pendingEarnings.get(0).getPayoutWeek() : "N/A")
                    .build();

            com.stripe.model.Transfer transfer = com.stripe.model.Transfer.create(transferParams);
            stripeTransferId = transfer.getId();
            log.info("Stripe Transfer {} created: ₹{} to vendorId={} (account: {})",
                    stripeTransferId, totalVendorEarning, vendorId, stripeAccountId);

        } catch (com.stripe.exception.StripeException se) {
            log.error("Stripe API error for vendorId={}: {}", vendorId, se.getMessage());
            return ResponseEntity.status(502).body(Map.of(
                    "message", "Stripe transfer failed: " + se.getMessage(),
                    "stripeCode", se.getCode() != null ? se.getCode() : "unknown"
            ));
        }

        // ── 4. Mark earnings as PAID ─────────────────────────────────────────
        String notes = "Stripe Transfer | TxnId: " + stripeTransferId + " | Account: " + stripeAccountId;
        for (VendorEarning earning : pendingEarnings) {
            earning.setPayoutStatus(VendorEarning.PayoutStatus.PAID);
            earning.setPaidAt(java.time.LocalDateTime.now());
            earning.setAdminNotes(notes);
        }
        vendorEarningRepository.saveAll(pendingEarnings);
        log.info("Marked {} earnings as PAID for vendorId={}", pendingEarnings.size(), vendorId);

        // ── 5. Send payout receipt email ─────────────────────────────────────
        String formattedAmount   = "₹" + totalVendorEarning.setScale(2, java.math.RoundingMode.HALF_UP);
        String formattedGross    = "₹" + totalOrderAmount.setScale(2, java.math.RoundingMode.HALF_UP);
        String formattedPlatform = "₹" + totalOrderAmount.subtract(totalVendorEarning).setScale(2, java.math.RoundingMode.HALF_UP);
        String transferDate      = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy"));

        String vendorEmail = null;
        String vendorName  = storeName;
        try {
            Object userIdObj = vDetails.get("userId");
            if (userIdObj != null) {
                ResponseEntity<Map> uResp = restTemplate.getForEntity(
                        authServiceUrl + "/api/internal/users/" + userIdObj, Map.class);
                if (uResp.getBody() != null) {
                    vendorEmail = (String) uResp.getBody().get("email");
                    vendorName  = (String) uResp.getBody().getOrDefault("name", storeName);
                }
            }
        } catch (Exception ex) { log.warn("Could not fetch vendor email for receipt: {}", ex.getMessage()); }

        if (vendorEmail != null && !vendorEmail.isBlank()) {
            try {
                Map<String, Object> emailPayload = new HashMap<>();
                emailPayload.put("vendorEmail",         vendorEmail);
                emailPayload.put("vendorName",          vendorName);
                emailPayload.put("storeName",           storeName);
                emailPayload.put("amount",              formattedAmount);
                emailPayload.put("grossAmount",         formattedGross);
                emailPayload.put("platformFee",         formattedPlatform);
                emailPayload.put("transferMethod",      "Stripe");
                emailPayload.put("referenceNumber",     stripeTransferId);
                emailPayload.put("transferDate",        transferDate);
                emailPayload.put("maskedAccountNumber",
                        bankAccountNumber.length() > 4
                                ? "•••• •••• " + bankAccountNumber.substring(bankAccountNumber.length() - 4)
                                : bankAccountNumber);

                HttpHeaders emailHeaders = new HttpHeaders();
                emailHeaders.setContentType(MediaType.APPLICATION_JSON);
                restTemplate.postForEntity(
                        notificationServiceUrl + "/api/internal/notifications/vendor-payout",
                        new HttpEntity<>(emailPayload, emailHeaders), Map.class);
                log.info("Payout email sent to {} for Stripe transfer {}", vendorEmail, stripeTransferId);
            } catch (Exception ex) {
                log.error("Failed to send Stripe payout email for vendorId={}: {}", vendorId, ex.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of(
                "message", "Stripe Transfer of " + formattedAmount + " successfully sent to vendor " + vendorId,
                "stripeTransferId", stripeTransferId,
                "stripeAccountId", stripeAccountId,
                "totalPaid", totalVendorEarning
        ));
    }

    /**
     * Vendor: view their own earnings summary (Pending vs Total Paid).
     */
    @GetMapping("/api/vendors/me/earnings")
    public ResponseEntity<Map<String, Object>> getMyEarnings(@RequestHeader("X-User-Id") Long userId) {
        // Find vendorId from vendor-service by userId
        Long vendorId = null;
        try {
            String url = vendorServiceUrl + "/api/internal/vendors/by-user/" + userId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("id")) {
                vendorId = ((Number) response.getBody().get("id")).longValue();
            }
        } catch (Exception e) {
            log.error("Failed to find vendorId for userId {}: {}", userId, e.getMessage());
        }

        if (vendorId == null) {
            return ResponseEntity.ok(Map.of(
                    "pendingPayout", BigDecimal.ZERO,
                    "totalPaidOut", BigDecimal.ZERO,
                    "earningsList", List.of()
            ));
        }

        BigDecimal pending = vendorEarningRepository.sumPendingEarningsByVendor(vendorId);
        BigDecimal paid = vendorEarningRepository.sumPaidEarningsByVendor(vendorId);
        List<VendorEarning> earnings = vendorEarningRepository.findByVendorId(vendorId);

        return ResponseEntity.ok(Map.of(
                "vendorId", vendorId,
                "pendingPayout", pending,
                "totalPaidOut", paid,
                "earningsList", earnings
        ));
    }
}
