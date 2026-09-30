package com.ecommerce.vendor.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    // ─────────────────────────────────────────────────────────────
    // VENDOR REGISTRATION RECEIVED
    // ─────────────────────────────────────────────────────────────

    /**
     * Sent immediately after a vendor submits their store registration.
     * Informs them that their application is under review.
     */
    @Async
    public void sendVendorRegistrationEmail(String toEmail, String storeName) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Application Received — ApexMarket Vendor Program");
            message.setText(
                "Dear Seller,\n\n" +
                "Thank you for registering \"" + storeName + "\" on ApexMarket.\n\n" +
                "Your application has been successfully received and is currently under review by our team. " +
                "We carefully evaluate each application to ensure a high-quality marketplace experience for all buyers and sellers.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "WHAT HAPPENS NEXT?\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "  1. Our team will review your store details within 24–48 business hours.\n" +
                "  2. You will receive an email notification once a decision has been made.\n" +
                "  3. Upon approval, you can immediately begin listing your products and receiving orders.\n\n" +
                "In the meantime, please ensure that the information provided in your application is accurate " +
                "and that you have access to the email associated with your account.\n\n" +
                "If you have any questions or need to update your application, please contact our support team.\n\n" +
                "Warm regards,\n" +
                "The ApexMarket Team\n" +
                frontendUrl + "\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "This is an automated message. Please do not reply to this email.\n" +
                "© ApexMarket — Premium E-Commerce Platform"
            );
            mailSender.send(message);
            log.info("Vendor registration confirmation email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send vendor registration email to {}: {}", toEmail, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // VENDOR APPLICATION APPROVED
    // ─────────────────────────────────────────────────────────────

    /**
     * Sent when an admin approves a vendor's application.
     * Confirms activation and provides a link to the seller portal.
     */
    @Async
    public void sendVendorApprovalEmail(String toEmail, String storeName) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Congratulations! Your Vendor Account is Approved — ApexMarket");
            message.setText(
                "Dear Seller,\n\n" +
                "Excellent news! We are pleased to inform you that your store \"" + storeName + "\" has been " +
                "officially reviewed and approved by the ApexMarket team.\n\n" +
                "Your seller account is now fully activated and you can begin operations immediately.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "GET STARTED\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "  1. Log in to your vendor portal: " + frontendUrl + "\n" +
                "  2. Navigate to My Listings to add your first products.\n" +
                "  3. Set competitive pricing and high-quality images to attract buyers.\n" +
                "  4. Monitor incoming orders from the Orders section of your dashboard.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "SELLER PORTAL\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                frontendUrl + "\n\n" +
                "We are delighted to have you as a part of the ApexMarket community and look forward to a " +
                "successful partnership. If you need assistance getting started, our support team is always available.\n\n" +
                "Best regards,\n" +
                "The ApexMarket Team\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "This is an automated message. Please do not reply to this email.\n" +
                "© ApexMarket — Premium E-Commerce Platform"
            );
            mailSender.send(message);
            log.info("Vendor approval email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send vendor approval email to {}: {}", toEmail, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // VENDOR APPLICATION REJECTED
    // ─────────────────────────────────────────────────────────────

    /**
     * Sent when an admin rejects a vendor's application, including the stated reason.
     */
    @Async
    public void sendVendorRejectionEmail(String toEmail, String storeName, String reason) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Vendor Application Update — ApexMarket");
            message.setText(
                "Dear Seller,\n\n" +
                "Thank you for your interest in becoming a seller on ApexMarket.\n\n" +
                "After a thorough review of your application for the store \"" + storeName + "\", we regret to " +
                "inform you that we are unable to approve your account at this time.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "REASON FOR DECISION\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "  " + reason + "\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "NEXT STEPS\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "If you believe this decision was made in error, or if you have resolved the issue stated above, " +
                "you are welcome to submit a new application after addressing the concern.\n\n" +
                "For further clarification or assistance, please reach out to our support team by replying to this email.\n\n" +
                "We appreciate your understanding and wish you the best in your business endeavours.\n\n" +
                "Regards,\n" +
                "The ApexMarket Team\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "This is an automated message. Please do not reply to this email.\n" +
                "© ApexMarket — Premium E-Commerce Platform"
            );
            mailSender.send(message);
            log.info("Vendor rejection email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send vendor rejection email to {}: {}", toEmail, e.getMessage());
        }
    }
}
