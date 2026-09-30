package com.ecommerce.notification.service;

import com.ecommerce.notification.dto.OrderConfirmationRequest;
import com.ecommerce.notification.dto.OrderStatusUpdateRequest;
import com.ecommerce.notification.dto.PaymentNotificationRequest;
import com.ecommerce.notification.dto.VendorPayoutRequest;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

/**
 * Implementation of NotificationService.
 *
 * All email methods are annotated with @Async so callers (order-service,
 * payment-service) are never blocked waiting for the SMTP server to respond.
 *
 * Thymeleaf is used to render rich HTML email templates stored in:
 *   src/main/resources/templates/email/
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.mail.from-name}")
    private String fromName;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    // ─────────────────────────────────────────────────────────────────────────
    // ORDER CONFIRMATION
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    @Override
    public void sendOrderConfirmation(OrderConfirmationRequest request) {
        try {
            Context ctx = new Context();
            ctx.setVariable("customerName",   request.getCustomerName());
            ctx.setVariable("orderId",        request.getOrderId());
            ctx.setVariable("shippingAddress",request.getShippingAddress());
            ctx.setVariable("paymentMethod",  request.getPaymentMethod());
            ctx.setVariable("totalAmount",    request.getTotalAmount());
            ctx.setVariable("items",          request.getItems());
            ctx.setVariable("frontendUrl",    frontendUrl);

            String htmlBody = templateEngine.process("email/order-confirmation", ctx);

            sendHtmlEmail(
                    request.getCustomerEmail(),
                    "✅ Order Confirmed — #" + request.getOrderId(),
                    htmlBody
            );

            log.info("Order confirmation email sent to {} for order #{}", request.getCustomerEmail(), request.getOrderId());

        } catch (Exception e) {
            log.error("Failed to send order confirmation to {}: {}", request.getCustomerEmail(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENT NOTIFICATION
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    @Override
    public void sendPaymentNotification(PaymentNotificationRequest request) {
        try {
            Context ctx = new Context();
            ctx.setVariable("customerName",   request.getCustomerName());
            ctx.setVariable("orderId",        request.getOrderId());
            ctx.setVariable("amount",         request.getAmount());
            ctx.setVariable("paymentStatus",  request.getPaymentStatus());
            ctx.setVariable("paymentId",      request.getPaymentId());
            ctx.setVariable("failureReason",  request.getFailureReason());
            ctx.setVariable("frontendUrl",    frontendUrl);

            String htmlBody = templateEngine.process("email/payment-notification", ctx);

            boolean isSuccess = "SUCCESS".equalsIgnoreCase(request.getPaymentStatus());
            String subject = isSuccess
                    ? "✅ Payment Successful — Order #" + request.getOrderId()
                    : "❌ Payment Failed — Order #" + request.getOrderId();

            sendHtmlEmail(request.getCustomerEmail(), subject, htmlBody);

            log.info("Payment {} email sent to {} for order #{}", request.getPaymentStatus(),
                    request.getCustomerEmail(), request.getOrderId());

        } catch (Exception e) {
            log.error("Failed to send payment notification to {}: {}", request.getCustomerEmail(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ORDER STATUS UPDATE
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    @Override
    public void sendOrderStatusUpdate(OrderStatusUpdateRequest request) {
        try {
            Context ctx = new Context();
            ctx.setVariable("customerName",       request.getCustomerName());
            ctx.setVariable("orderId",            request.getOrderId());
            ctx.setVariable("newStatus",          request.getNewStatus());
            ctx.setVariable("trackingNumber",     request.getTrackingNumber());
            ctx.setVariable("cancellationReason", request.getCancellationReason());
            ctx.setVariable("frontendUrl",        frontendUrl);

            String htmlBody = templateEngine.process("email/order-status-update", ctx);

            String emoji = switch (request.getNewStatus().toUpperCase()) {
                case "SHIPPED"    -> "🚚";
                case "DELIVERED"  -> "📦";
                case "CANCELLED"  -> "❌";
                case "PROCESSING" -> "⚙️";
                default           -> "🔔";
            };

            String subject = emoji + " Order #" + request.getOrderId()
                    + " — " + request.getNewStatus();

            sendHtmlEmail(request.getCustomerEmail(), subject, htmlBody);

            log.info("Order status update email ({}) sent to {} for order #{}",
                    request.getNewStatus(), request.getCustomerEmail(), request.getOrderId());

        } catch (Exception e) {
            log.error("Failed to send order status update to {}: {}", request.getCustomerEmail(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // VENDOR PAYOUT RECEIPT
    // ─────────────────────────────────────────────────────────────────────────

    @Async
    @Override
    public void sendVendorPayoutEmail(VendorPayoutRequest request) {
        try {
            Context ctx = new Context();
            ctx.setVariable("vendorName",          request.getVendorName());
            ctx.setVariable("storeName",           request.getStoreName());
            ctx.setVariable("amount",              request.getAmount());
            ctx.setVariable("grossAmount",         request.getGrossAmount());
            ctx.setVariable("platformFee",         request.getPlatformFee());
            ctx.setVariable("transferMethod",      request.getTransferMethod());
            ctx.setVariable("referenceNumber",     request.getReferenceNumber());
            ctx.setVariable("transferDate",        request.getTransferDate());
            ctx.setVariable("maskedAccountNumber", request.getMaskedAccountNumber());
            ctx.setVariable("frontendUrl",         frontendUrl);

            String htmlBody = templateEngine.process("email/vendor-payout", ctx);

            sendHtmlEmail(
                    request.getVendorEmail(),
                    "\uD83D\uDCB0 Payout of " + request.getAmount() + " Received — " + request.getStoreName(),
                    htmlBody
            );

            log.info("Vendor payout email sent to {} for store '{}', amount {}, ref {}",
                    request.getVendorEmail(), request.getStoreName(),
                    request.getAmount(), request.getReferenceNumber());

        } catch (Exception e) {
            log.error("Failed to send vendor payout email to {}: {}", request.getVendorEmail(), e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────────────────────────────────────


    /**
     * Sends a multipart HTML email using the configured JavaMailSender.
     */
    private void sendHtmlEmail(String to, String subject, String htmlBody) throws MessagingException, java.io.UnsupportedEncodingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromEmail, fromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlBody, true); // true = HTML
        mailSender.send(message);
    }
}
