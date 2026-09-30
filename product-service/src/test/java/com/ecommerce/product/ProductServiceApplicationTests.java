package com.ecommerce.product;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Basic Spring Boot integration test to ensure the application context loaded successfully.
 * Uses the "test" profile.
 */
@SpringBootTest
@ActiveProfiles("test")
class ProductServiceApplicationTests {

    @Test
    void contextLoads() {
        // Confirms that the Spring container boots without throwing exceptions.
    }
}
