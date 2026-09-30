package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.CategoryRequest;
import com.ecommerce.product.dto.request.ProductRequest;
import com.ecommerce.product.dto.request.ReviewRequest;
import com.ecommerce.product.dto.response.CategoryResponse;
import com.ecommerce.product.dto.response.ProductCardResponse;
import com.ecommerce.product.dto.response.ProductDetailResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

/**
 * Service interface for Category, Product, and Review management.
 */
public interface ProductService {

    // ─────────────────────────────────────────────────────────────
    // CATEGORY MANAGEMENT
    // ─────────────────────────────────────────────────────────────
    CategoryResponse createCategory(CategoryRequest request);
    CategoryResponse updateCategory(Long id, CategoryRequest request);
    void deleteCategory(Long id);
    List<CategoryResponse> getAllCategories();
    CategoryResponse getCategoryBySlug(String slug);

    // ─────────────────────────────────────────────────────────────
    // PRODUCT MANAGEMENT
    // ─────────────────────────────────────────────────────────────
    ProductDetailResponse createProduct(Long userId, ProductRequest request);
    ProductDetailResponse updateProduct(Long userId, Long productId, ProductRequest request);
    void deleteProduct(Long userId, Long productId);
    ProductDetailResponse getProductById(Long id);
    ProductDetailResponse getProductBySlug(String slug);
    
    // Dynamic public listing and filtering
    Page<ProductCardResponse> getProducts(
            String categorySlug, BigDecimal minPrice, BigDecimal maxPrice,
            String search, Boolean featured, String sort, int page, int size
    );

    // Vendor portal catalog listing
    Page<ProductCardResponse> getVendorProducts(Long userId, int page, int size);

    // ─────────────────────────────────────────────────────────────
    // INTERNAL & ADMINISTRATIVE
    // ─────────────────────────────────────────────────────────────
    void adminDeactivateProduct(Long id);
    void adminDeleteProduct(Long id);
    long getProductCountByVendorId(Long vendorId);
    ProductDetailResponse reduceStock(Long productId, int quantity);

    // ─────────────────────────────────────────────────────────────
    // PRODUCT REVIEWS
    // ─────────────────────────────────────────────────────────────
    ReviewResponse createReview(Long userId, Long productId, ReviewRequest request);
    Page<ReviewResponse> getProductReviews(Long productId, Pageable pageable);
}
