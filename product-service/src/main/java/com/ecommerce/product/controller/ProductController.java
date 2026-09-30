package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.ProductRequest;
import com.ecommerce.product.dto.request.ReviewRequest;
import com.ecommerce.product.dto.response.*;
import com.ecommerce.product.service.ProductService;
import com.ecommerce.product.service.S3Service;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Controller exposing REST endpoints for public product catalog, 
 * vendor management, product image uploads, and customer reviews.
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final S3Service s3Service;

    // ─────────────────────────────────────────────────────────────
    // PUBLIC PRODUCT CATALOG ENDPOINTS
    // ─────────────────────────────────────────────────────────────

    /**
     * Public endpoint to browse, filter, and search products.
     */
    @GetMapping
    public ResponseEntity<Page<ProductCardResponse>> getProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        
        Page<ProductCardResponse> response = productService.getProducts(
                category, minPrice, maxPrice, search, featured, sort, page, size
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Public endpoint to fetch full product details using its unique ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProductDetailResponse> getProductById(@PathVariable Long id) {
        ProductDetailResponse response = productService.getProductById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Public endpoint to fetch full product details using its URL-friendly slug.
     */
    @GetMapping("/slug/{slug}")
    public ResponseEntity<ProductDetailResponse> getProductBySlug(@PathVariable String slug) {
        ProductDetailResponse response = productService.getProductBySlug(slug);
        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────
    // VENDOR MANAGEMENT ENDPOINTS
    // ─────────────────────────────────────────────────────────────

    /**
     * Vendor endpoint to list all products listed by the authenticated vendor.
     * Accessible by VENDOR role. Passes X-User-Id.
     */
    @GetMapping("/vendor/me")
    public ResponseEntity<Page<ProductCardResponse>> getMyProducts(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<ProductCardResponse> response = productService.getVendorProducts(userId, page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * Vendor endpoint to create a new product catalog entry.
     */
    @PostMapping
    public ResponseEntity<ProductDetailResponse> createProduct(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ProductRequest request) {
        ProductDetailResponse response = productService.createProduct(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Vendor endpoint to update an existing product entry.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ProductDetailResponse> updateProduct(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest request) {
        ProductDetailResponse response = productService.updateProduct(userId, id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Vendor endpoint to soft-delete (deactivate) a product listing.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteProduct(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id) {
        productService.deleteProduct(userId, id);
        return ResponseEntity.ok(new MessageResponse("Product successfully deleted"));
    }

    /**
     * Vendor endpoint to upload a product image to S3.
     * Accepts a file, uploads it, and returns the public CDN URL.
     */
    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam("file") MultipartFile file) {
        
        // Validate file type (supports jpg, jpeg, png, webp, gif, svg, etc.)
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only image files (JPEG, PNG, WEBP, GIF, SVG) are supported"));
        }

        // Validate file size (max 5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("error", "File size exceeds limit of 5MB"));
        }

        String imageUrl = s3Service.uploadFile(file);
        return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
    }

    // ─────────────────────────────────────────────────────────────
    // PRODUCT REVIEWS ENDPOINTS
    // ─────────────────────────────────────────────────────────────

    /**
     * Customer endpoint to write a product review.
     * Enforced role CUSTOMER at Gateway level.
     */
    @PostMapping("/{id}/reviews")
    public ResponseEntity<ReviewResponse> createReview(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long id,
            @Valid @RequestBody ReviewRequest request) {
        ReviewResponse response = productService.createReview(userId, id, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Public endpoint to retrieve reviews for a specific product.
     */
    @GetMapping("/{id}/reviews")
    public ResponseEntity<Page<ReviewResponse>> getProductReviews(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ReviewResponse> response = productService.getProductReviews(id, pageable);
        return ResponseEntity.ok(response);
    }
}
