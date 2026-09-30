package com.ecommerce.cart;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main application class for the Cart Service.
 * Runs on port 8084 and manages the server-side shopping cart for each customer.
 * Each user gets one cart tied to their userId. Cart items are stored in the database.
 */
@SpringBootApplication
public class CartServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CartServiceApplication.class, args);
    }
}
