package com.ecommerce.notification;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Notification Service — responsible for sending all transactional emails
 * triggered by events across the e-commerce platform:
 *  - Order placed confirmation
 *  - Payment successful / failed
 *  - Order status updates (shipped, delivered, cancelled)
 *
 * Exposes internal-only REST endpoints consumed by order-service and payment-service.
 * Emails are sent asynchronously so callers are never blocked.
 */
@SpringBootApplication
@EnableAsync
public class NotificationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(NotificationServiceApplication.class, args);
    }
}
