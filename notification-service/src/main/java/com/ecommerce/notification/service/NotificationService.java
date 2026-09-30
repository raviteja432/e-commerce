package com.ecommerce.notification.service;

import com.ecommerce.notification.dto.OrderConfirmationRequest;
import com.ecommerce.notification.dto.OrderStatusUpdateRequest;
import com.ecommerce.notification.dto.PaymentNotificationRequest;
import com.ecommerce.notification.dto.VendorPayoutRequest;

/**
 * Contract for the notification service — one method per email event type.
 */
public interface NotificationService {

    /** Sends an order confirmation email with item summary and shipping info. */
    void sendOrderConfirmation(OrderConfirmationRequest request);

    /** Sends a payment success or failure email. */
    void sendPaymentNotification(PaymentNotificationRequest request);

    /** Sends an order status update email (shipped, delivered, cancelled, etc.). */
    void sendOrderStatusUpdate(OrderStatusUpdateRequest request);

    /** Sends a payout receipt email to the vendor after admin initiates a bank transfer. */
    void sendVendorPayoutEmail(VendorPayoutRequest request);
}
