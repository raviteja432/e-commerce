package com.ecommerce.product.controller;

import com.ecommerce.product.dto.response.CategoryResponse;
import com.ecommerce.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Public controller for Category operations.
 * These endpoints do not require user authentication.
 */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final ProductService productService;

    /**
     * Retrieves all active categories.
     * Accessible publicly.
     */
    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getCategories() {
        return ResponseEntity.ok(productService.getAllCategories());
    }

    /**
     * Retrieves category details using its unique slug.
     */
    @GetMapping("/{slug}")
    public ResponseEntity<CategoryResponse> getCategoryBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(productService.getCategoryBySlug(slug));
    }
}
