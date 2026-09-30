package com.example.gateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Verifies that the API Gateway application context loads successfully —
 * all beans (JwtUtil, JwtAuthFilter, GatewayConfig, SecurityConfig) are
 * wired correctly and no startup errors occur.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GatewayApplicationTests {

    @Test
    void contextLoads() {
        // Confirms the Spring container boots without any configuration or wiring errors
    }
}
