package com.example.gateway.config;

import com.example.gateway.filter.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.server.mvc.handler.GatewayRouterFunctions;
import org.springframework.cloud.gateway.server.mvc.handler.HandlerFunctions;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.function.RequestPredicates;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.ServerResponse;

import java.net.URI;

/**
 * Java-based route configuration for Spring Cloud Gateway MVC.
 *
 * Routes are split into two groups:
 *  1. Public  — no JWT required (auth login/register, public product catalog)
 *  2. Protected — JWT required; the JwtAuthFilter validates the token and
 *                 injects X-User-Id and X-User-Role into the forwarded request.
 */
@Configuration
@RequiredArgsConstructor
public class GatewayConfig {

    private final JwtAuthFilter jwtAuthFilter;

    // ─────────────────────────────────────────────────────────────
    // PUBLIC ROUTES — no JWT validation required
    // ─────────────────────────────────────────────────────────────

    /**
     * Auth Service — truly public endpoints only (register, login, forgot/reset password).
     * These do NOT require a JWT token.
     * Proxied to port 8081.
     */
    @Bean
    public RouterFunction<ServerResponse> authPublicRoutes() {
        return GatewayRouterFunctions.route("auth-service-public")
                .route(RequestPredicates.path("/api/auth/login")
                        .or(RequestPredicates.path("/api/auth/register"))
                        .or(RequestPredicates.path("/api/auth/forgot-password"))
                        .or(RequestPredicates.path("/api/auth/reset-password")),
                        HandlerFunctions.http(URI.create("http://localhost:8081")))
                .build();
    }

    /**
     * Product Service — public read-only catalog (product listing, details, categories, reviews GET).
     * Proxied to port 8083.
     * NOTE: Write endpoints (POST/PUT/DELETE) are handled by productProtectedRoutes below.
     */
    @Bean
    public RouterFunction<ServerResponse> productPublicRoutes() {
        return GatewayRouterFunctions.route("product-service-public")
                .route(RequestPredicates.GET("/api/products")
                        .or(RequestPredicates.GET("/api/products/{id}"))
                        .or(RequestPredicates.GET("/api/products/slug/{slug}"))
                        .or(RequestPredicates.GET("/api/products/{id}/reviews"))
                        .or(RequestPredicates.path("/api/categories/**")),
                        HandlerFunctions.http(URI.create("http://localhost:8083")))
                .build();
    }

    /**
     * Payment Service — Stripe webhook endpoint (public, Stripe calls this directly).
     * Proxied to port 8086.
     */
    @Bean
    public RouterFunction<ServerResponse> paymentPublicRoutes() {
        return GatewayRouterFunctions.route("payment-service-public")
                .route(RequestPredicates.path("/api/payments/webhook"),
                        HandlerFunctions.http(URI.create("http://localhost:8086")))
                .build();
    }

    /**
     * Product Service — local uploaded image files (public, no JWT needed).
     * Proxied to port 8083. Used as fallback when S3 is unavailable.
     */
    @Bean
    public RouterFunction<ServerResponse> uploadsRoutes() {
        return GatewayRouterFunctions.route("product-service-uploads")
                .route(RequestPredicates.path("/uploads/**"),
                        HandlerFunctions.http(URI.create("http://localhost:8083")))
                .build();
    }

    // ─────────────────────────────────────────────────────────────
    // PROTECTED ROUTES — JWT required
    // JwtAuthFilter validates token and injects X-User-Id / X-User-Role
    // ─────────────────────────────────────────────────────────────

    /**
     * Auth Service — protected endpoints (profile, update profile, change password, addresses).
     * Accessible by any authenticated role.
     */
    @Bean
    public RouterFunction<ServerResponse> authProtectedRoutes() {
        return GatewayRouterFunctions.route("auth-service-protected")
                .route(RequestPredicates.path("/api/auth/me")
                        .or(RequestPredicates.path("/api/auth/password"))
                        .or(RequestPredicates.path("/api/users/**"))
                        .or(RequestPredicates.path("/api/addresses/**"))
                        .or(RequestPredicates.path("/api/customers/**"))
                        .or(RequestPredicates.path("/api/admin/users/**")),
                        HandlerFunctions.http(URI.create("http://localhost:8081")))
                .filter(jwtAuthFilter)
                .build();
    }

    /**
     * Vendor Service — vendor profile and dashboard (VENDOR role enforced by downstream service).
     */
    @Bean
    public RouterFunction<ServerResponse> vendorRoutes() {
        return GatewayRouterFunctions.route("vendor-service")
                .route(RequestPredicates.path("/api/vendors/**")
                        .or(RequestPredicates.path("/api/admin/vendors/**")),
                        HandlerFunctions.http(URI.create("http://localhost:8082")))
                .filter(jwtAuthFilter)
                .build();
    }

    /**
     * Product Service — protected write endpoints for vendors and admins.
     * Covers vendor catalog (GET vendor/me), create/update/delete products,
     * image upload, and reviews submission — all require JWT.
     */
    @Bean
    public RouterFunction<ServerResponse> productProtectedRoutes() {
        return GatewayRouterFunctions.route("product-service-protected")
                .route(RequestPredicates.path("/api/products/vendor/**")
                        .or(RequestPredicates.POST("/api/products"))
                        .or(RequestPredicates.POST("/api/products/upload-image"))
                        .or(RequestPredicates.PUT("/api/products/{id}"))
                        .or(RequestPredicates.DELETE("/api/products/{id}"))
                        .or(RequestPredicates.POST("/api/products/{id}/reviews")),
                        HandlerFunctions.http(URI.create("http://localhost:8083")))
                .filter(jwtAuthFilter)
                .build();
    }

    /**
     * Product Service — admin category management (ADMIN role enforced by downstream service).
     */
    @Bean
    public RouterFunction<ServerResponse> adminRoutes() {
        return GatewayRouterFunctions.route("product-service-admin")
                .route(RequestPredicates.path("/api/admin/products/**")
                        .or(RequestPredicates.path("/api/admin/categories/**")),
                        HandlerFunctions.http(URI.create("http://localhost:8083")))
                .filter(jwtAuthFilter)
                .build();
    }

    /**
     * Cart Service — shopping cart management (CUSTOMER role).
     */
    @Bean
    public RouterFunction<ServerResponse> cartRoutes() {
        return GatewayRouterFunctions.route("cart-service")
                .route(RequestPredicates.path("/api/cart/**"),
                        HandlerFunctions.http(URI.create("http://localhost:8084")))
                .filter(jwtAuthFilter)
                .build();
    }

    /**
     * Order Service — order placement and history.
     */
    @Bean
    public RouterFunction<ServerResponse> orderRoutes() {
        return GatewayRouterFunctions.route("order-service")
                .route(RequestPredicates.path("/api/orders/**"),
                        HandlerFunctions.http(URI.create("http://localhost:8085")))
                .filter(jwtAuthFilter)
                .build();
    }

    /**
     * Payment Service — status checking, admin payouts, and vendor earnings endpoints (protected).
     */
    @Bean
    public RouterFunction<ServerResponse> paymentProtectedRoutes() {
        return GatewayRouterFunctions.route("payment-service-protected")
                .route(RequestPredicates.path("/api/payments/status/**")
                        .or(RequestPredicates.path("/api/admin/payouts/**"))
                        .or(RequestPredicates.path("/api/vendors/me/earnings")),
                        HandlerFunctions.http(URI.create("http://localhost:8086")))
                .filter(jwtAuthFilter)
                .build();
    }
}
