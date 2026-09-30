package com.ecommerce.product.controller;

import com.ecommerce.product.dto.response.MessageResponse;
import com.ecommerce.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller exposing Product management endpoints for administrative users.
 * Role check enforcement occurs at the Gateway level (X-User-Role must be ADMIN).
 */
@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
public class AdminProductController {

    private final ProductService productService;

    /**
     * Admin endpoint to deactivate (hide from public listings) a product.
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<MessageResponse> deactivateProduct(@PathVariable Long id) {
        productService.adminDeactivateProduct(id);
        return ResponseEntity.ok(new MessageResponse("Product successfully deactivated by administrator"));
    }

    /**
     * Admin endpoint to permanently hard-delete a product from database.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteProduct(@PathVariable Long id) {
        productService.adminDeleteProduct(id);
        return ResponseEntity.ok(new MessageResponse("Product permanently deleted by administrator"));
    }
}
