package com.ecommerce.notification.controller;

import com.ecommerce.notification.dto.MessageResponse;
import com.ecommerce.notification.dto.OrderConfirmationRequest;
import com.ecommerce.notification.dto.OrderStatusUpdateRequest;
import com.ecommerce.notification.dto.PaymentNotificationRequest;
import com.ecommerce.notification.dto.VendorPayoutRequest;
import com.ecommerce.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Internal REST controller — only called by other microservices (order-service,
 * payment-service). Not exposed through the API Gateway public routes.
 *
 * All endpoints are fire-and-forget: they return 202 Accepted immediately
 * since email sending happens asynchronously.
 */
@RestController
@RequestMapping("/api/internal/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Called by order-service immediately after an order is persisted.
     * Triggers the "Order Confirmed" email to the customer.
     */
    @PostMapping("/order-confirmation")
    public ResponseEntity<MessageResponse> sendOrderConfirmation(
            @Valid @RequestBody OrderConfirmationRequest request) {
        log.info("Received order confirmation notification request for order #{}", request.getOrderId());
        notificationService.sendOrderConfirmation(request);
        return ResponseEntity.accepted()
                .body(new MessageResponse("Order confirmation email queued for " + request.getCustomerEmail()));
    }

    /**
     * Called by payment-service after processing a payment.
     * Sends a "Payment Successful" or "Payment Failed" email.
     */
    @PostMapping("/payment")
    public ResponseEntity<MessageResponse> sendPaymentNotification(
            @Valid @RequestBody PaymentNotificationRequest request) {
        log.info("Received payment {} notification request for order #{}", request.getPaymentStatus(), request.getOrderId());
        notificationService.sendPaymentNotification(request);
        return ResponseEntity.accepted()
                .body(new MessageResponse("Payment notification email queued for " + request.getCustomerEmail()));
    }

    /**
     * Called by order-service when an admin or vendor updates an order status.
     * Sends a status-specific email (shipped, delivered, cancelled, etc.).
     */
    @PostMapping("/order-status")
    public ResponseEntity<MessageResponse> sendOrderStatusUpdate(
            @Valid @RequestBody OrderStatusUpdateRequest request) {
        log.info("Received order status update notification: order #{} → {}", request.getOrderId(), request.getNewStatus());
        notificationService.sendOrderStatusUpdate(request);
        return ResponseEntity.accepted()
                .body(new MessageResponse("Order status update email queued for " + request.getCustomerEmail()));
    }

    /**
     * Called by payment-service after admin confirms a bank transfer to a vendor.
     * Sends the vendor a professional payout receipt email with UTR details.
     */
    @PostMapping("/vendor-payout")
    public ResponseEntity<MessageResponse> sendVendorPayoutEmail(
            @Valid @RequestBody VendorPayoutRequest request) {
        log.info("Received vendor payout notification for store '{}', amount {}", request.getStoreName(), request.getAmount());
        notificationService.sendVendorPayoutEmail(request);
        return ResponseEntity.accepted()
                .body(new MessageResponse("Vendor payout email queued for " + request.getVendorEmail()));
    }
}
