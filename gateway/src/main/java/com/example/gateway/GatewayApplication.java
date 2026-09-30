package com.example.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

/**
 * API Gateway — the single entry point for the e-commerce platform.
 *
 * Responsibilities:
 *  - JWT token validation on protected routes
 *  - Forwarding X-User-Id and X-User-Role headers to downstream services
 *  - Route-based role enforcement (ADMIN, VENDOR, CUSTOMER)
 *  - Proxying requests to: auth-service, vendor-service, product-service,
 *    cart-service, and order-service
 */
@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
