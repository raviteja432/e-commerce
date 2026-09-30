package com.ecommerce.auth.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
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
    // PASSWORD RESET EMAIL  (HTML – proper clickable button in Gmail)
    // ─────────────────────────────────────────────────────────────
    @Async
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        try {
            // ⚠️ The app is a hash-based SPA (only index.html exists).
            // Links must use the hash-router format: /#/reset-password?token=...
            // Sending /reset-password.html would cause a 404 Whitelabel Error.
            String resetLink = frontendUrl + "/#/reset-password?token=" + resetToken;

            // DEBUG log so you can test the link locally without opening Gmail
            log.debug("Password reset link for {}: {}", toEmail, resetLink);

            String htmlBody =
                "<!DOCTYPE html>" +
                "<html><body style='font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;'>" +
                "<div style='max-width:520px;margin:40px auto;background:#fff;border-radius:10px;" +
                "     padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);'>" +
                "  <h2 style='color:#1a1a2e;margin-top:0;'>Password Reset Request</h2>" +
                "  <p style='color:#555;'>Hello,</p>" +
                "  <p style='color:#555;'>We received a request to reset the password for your account.</p>" +
                "  <p style='color:#555;'>Click the button below to set a new password. This link is valid for <strong>15 minutes</strong>.</p>" +
                "  <div style='text-align:center;margin:32px 0;'>" +
                "    <a href='" + resetLink + "'" +
                "       style='background:#6c63ff;color:#fff;padding:14px 32px;border-radius:6px;" +
                "              text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;'>" +
                "      Reset My Password" +
                "    </a>" +
                "  </div>" +
                "  <p style='color:#555;'>Or copy and paste this link into your browser:</p>" +
                "  <p style='word-break:break-all;'>" +
                "    <a href='" + resetLink + "' style='color:#6c63ff;'>" + resetLink + "</a>" +
                "  </p>" +
                "  <hr style='border:none;border-top:1px solid #eee;margin:24px 0;'/>" +
                "  <p style='color:#aaa;font-size:12px;'>If you did not request a password reset, " +
                "  please ignore this email. Your password will not change.</p>" +
                "  <p style='color:#aaa;font-size:12px;'>E-Commerce Store Team</p>" +
                "</div></body></html>";

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Reset Your Password – E-Commerce Store");
            helper.setText(htmlBody, true); // true = send as HTML

            mailSender.send(mimeMessage);
            log.info("Password reset email sent to: {}", toEmail);

        } catch (Exception e) {
            log.error("Failed to send password reset email to {}: {}", toEmail, e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // VENDOR APPROVAL EMAIL
    // ─────────────────────────────────────────────────────────────
    @Async
    public void sendVendorApprovalEmail(String toEmail, String vendorName) {
        try {
            String loginLink = frontendUrl + "/login.html";

            String htmlBody =
                "<!DOCTYPE html>" +
                "<html><body style='font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;'>" +
                "<div style='max-width:520px;margin:40px auto;background:#fff;border-radius:10px;" +
                "     padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.08);'>" +
                "  <h2 style='color:#1a1a2e;margin-top:0;'>🎉 Your Vendor Account is Approved!</h2>" +
                "  <p style='color:#555;'>Hello " + vendorName + ",</p>" +
                "  <p style='color:#555;'>Great news! Your vendor account has been approved. " +
                "  You can now log in and start listing your products.</p>" +
                "  <div style='text-align:center;margin:32px 0;'>" +
                "    <a href='" + loginLink + "'" +
                "       style='background:#6c63ff;color:#fff;padding:14px 32px;border-radius:6px;" +
                "              text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;'>" +
                "      Login to Your Store" +
                "    </a>" +
                "  </div>" +
                "  <p style='color:#aaa;font-size:12px;'>E-Commerce Store Team</p>" +
                "</div></body></html>";

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Your Vendor Account Has Been Approved!");
            helper.setText(htmlBody, true);

            mailSender.send(mimeMessage);
            log.info("Vendor approval email sent to: {}", toEmail);

        } catch (Exception e) {
            log.error("Failed to send vendor approval email to {}: {}", toEmail, e.getMessage());
        }
    }
}
