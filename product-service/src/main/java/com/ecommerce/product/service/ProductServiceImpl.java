package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.CategoryRequest;
import com.ecommerce.product.dto.request.ProductRequest;
import com.ecommerce.product.dto.request.ReviewRequest;
import com.ecommerce.product.dto.response.*;
import com.ecommerce.product.entity.Category;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.entity.ProductImage;
import com.ecommerce.product.entity.ProductReview;
import com.ecommerce.product.exception.BadRequestException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.repository.CategoryRepository;
import com.ecommerce.product.repository.ProductImageRepository;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.repository.ProductReviewRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Core implementation service containing category, product catalog, and review logic.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductImageRepository productImageRepository;
    private final ProductReviewRepository productReviewRepository;
    private final RestTemplate restTemplate;

    @Value("${auth.service.url}")
    private String authServiceUrl;

    @Value("${vendor.service.url}")
    private String vendorServiceUrl;

    // ─────────────────────────────────────────────────────────────
    // CATEGORY MANAGEMENT LOGIC
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @CacheEvict(value = "all_categories", allEntries = true)
    public CategoryResponse createCategory(CategoryRequest request) {
        String slug = generateSlug(request.getName());
        
        // Prevent duplicate category names
        if (categoryRepository.existsByName(request.getName())) {
            throw new BadRequestException("Category with this name already exists");
        }

        // Prevent slug collisions
        if (categoryRepository.existsBySlug(slug)) {
            throw new BadRequestException("Category with this URL slug already exists");
        }

        Category category = Category.builder()
                .name(request.getName())
                .slug(slug)
                .iconUrl(request.getIconUrl())
                .active(request.isActive())
                .build();

        category = categoryRepository.save(category);
        log.info("Created category: {} with slug: {}", category.getName(), category.getSlug());
        return mapToCategoryResponse(category);
    }

    @Override
    @Transactional
    @CacheEvict(value = "all_categories", allEntries = true)
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        String slug = generateSlug(request.getName());

        // Ensure name is unique to other categories
        categoryRepository.findBySlug(slug).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new BadRequestException("Another category is already using this name/slug");
            }
        });

        category.setName(request.getName());
        category.setSlug(slug);
        category.setIconUrl(request.getIconUrl());
        category.setActive(request.isActive());

        category = categoryRepository.save(category);
        log.info("Updated category: {}", category.getName());
        return mapToCategoryResponse(category);
    }

    @Override
    @Transactional
    @CacheEvict(value = "all_categories", allEntries = true)
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        // Business Rule: Block deletion if there are active products using this category
        // Building specification to check for associated products
        Specification<Product> spec = (root, query, cb) -> cb.equal(root.get("category").get("id"), id);
        long count = productRepository.count(spec);
        if (count > 0) {
            throw new BadRequestException("Cannot delete category as it contains " + count + " products");
        }

        categoryRepository.delete(category);
        log.info("Deleted category ID: {}", id);
    }

    @Override
    @Cacheable(value = "all_categories", key = "'all'")
    public List<CategoryResponse> getAllCategories() {
        // Return only active categories for client-facing displays
        return categoryRepository.findByActiveTrue().stream()
                .map(this::mapToCategoryResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CategoryResponse getCategoryBySlug(String slug) {
        Category category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with slug: " + slug));
        return mapToCategoryResponse(category);
    }

    // ─────────────────────────────────────────────────────────────
    // PRODUCT MANAGEMENT LOGIC
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public ProductDetailResponse createProduct(Long userId, ProductRequest request) {
        // 1. Fetch vendor profile from Vendor Service based on the authenticated user ID
        Long vendorId = getVendorIdFromUserId(userId);
        
        // 2. Load the category
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));

        // 3. Generate a URL slug for the product, checking for collision
        String slug = generateSlug(request.getName());
        if (productRepository.existsBySlug(slug)) {
            // Append random characters if slug exists
            slug = slug + "-" + UUID.randomUUID().toString().substring(0, 6);
        }

        // 4. Create the product entity
        Product product = Product.builder()
                .vendorId(vendorId)
                .name(request.getName())
                .slug(slug)
                .shortDescription(request.getShortDescription())
                .description(request.getDescription())
                .category(category)
                .price(request.getPrice())
                .compareAtPrice(request.getCompareAtPrice())
                .stockQuantity(request.getStockQuantity())
                .sku(request.getSku())
                .active(request.isActive())
                .featured(request.isFeatured())
                .build();

        // 5. Add uploaded S3 image URLs to product
        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            for (int i = 0; i < request.getImageUrls().size(); i++) {
                ProductImage img = ProductImage.builder()
                        .imageUrl(request.getImageUrls().get(i))
                        .isPrimary(i == 0) // First image is set as default/primary
                        .displayOrder(i)
                        .build();
                product.addImage(img);
            }
        }

        product = productRepository.save(product);
        log.info("Created product: {} for vendorId: {}", product.getName(), vendorId);
        
        return mapToProductDetailResponse(product, getStoreName(vendorId));
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "product_detail_id", key = "#productId"),
        @CacheEvict(value = "product_detail_slug", allEntries = true)
    })
    public ProductDetailResponse updateProduct(Long userId, Long productId, ProductRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        // Verify that the requesting vendor owns the product
        Long vendorId = getVendorIdFromUserId(userId);
        if (!product.getVendorId().equals(vendorId)) {
            throw new BadRequestException("Unauthorized: You do not own this product listing");
        }

        // Validate category
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));

        // Regen slug if name changed
        if (!product.getName().equalsIgnoreCase(request.getName())) {
            String slug = generateSlug(request.getName());
            if (productRepository.existsBySlug(slug)) {
                slug = slug + "-" + UUID.randomUUID().toString().substring(0, 6);
            }
            product.setSlug(slug);
        }

        product.setName(request.getName());
        product.setShortDescription(request.getShortDescription());
        product.setDescription(request.getDescription());
        product.setCategory(category);
        product.setPrice(request.getPrice());
        product.setCompareAtPrice(request.getCompareAtPrice());
        product.setStockQuantity(request.getStockQuantity());
        product.setSku(request.getSku());
        product.setActive(request.isActive());
        product.setFeatured(request.isFeatured());

        // Update image URLs list
        product.getImages().clear();
        if (request.getImageUrls() != null && !request.getImageUrls().isEmpty()) {
            for (int i = 0; i < request.getImageUrls().size(); i++) {
                ProductImage img = ProductImage.builder()
                        .imageUrl(request.getImageUrls().get(i))
                        .isPrimary(i == 0)
                        .displayOrder(i)
                        .build();
                product.addImage(img);
            }
        }

        product = productRepository.save(product);
        log.info("Updated product ID: {}", product.getId());
        return mapToProductDetailResponse(product, getStoreName(vendorId));
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "product_detail_id", key = "#productId"),
        @CacheEvict(value = "product_detail_slug", allEntries = true)
    })
    public void deleteProduct(Long userId, Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        // Verify vendor ownership
        Long vendorId = getVendorIdFromUserId(userId);
        if (!product.getVendorId().equals(vendorId)) {
            throw new BadRequestException("Unauthorized: You do not own this product listing");
        }

        // Hard delete the product listing completely so it no longer appears in listings
        productRepository.delete(product);
        log.info("Deleted product ID: {}", productId);
    }

    @Override
    @Cacheable(value = "product_detail_id", key = "#id")
    public ProductDetailResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
        return mapToProductDetailResponse(product, getStoreName(product.getVendorId()));
    }

    @Override
    @Cacheable(value = "product_detail_slug", key = "#slug")
    public ProductDetailResponse getProductBySlug(String slug) {
        Product product = productRepository.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Active product not found with slug: " + slug));
        return mapToProductDetailResponse(product, getStoreName(product.getVendorId()));
    }

    @Override
    public Page<ProductCardResponse> getProducts(
            String categorySlug, BigDecimal minPrice, BigDecimal maxPrice,
            String search, Boolean featured, String sort, int page, int size) {

        // Build dynamic filters using JpaSpecification
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Rule: Public listing only queries active products
            predicates.add(cb.isTrue(root.get("active")));

            // Category filter — match by category name (case-insensitive) so frontend
            // can send the display name ("Laptops") rather than the slug ("laptops")
            if (categorySlug != null && !categorySlug.isBlank()) {
                Join<Product, Category> categoryJoin = root.join("category");
                predicates.add(
                    cb.or(
                        cb.equal(cb.lower(categoryJoin.get("name")), categorySlug.toLowerCase()),
                        cb.equal(cb.lower(categoryJoin.get("slug")), categorySlug.toLowerCase())
                    )
                );
            }

            // Price range filters
            if (minPrice != null) {
                predicates.add(cb.ge(root.get("price"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.le(root.get("price"), maxPrice));
            }

            // Full-text keyword search — matches any of:
            //   product name, short description, full description body, SKU, category name
            if (search != null && !search.isBlank()) {
                String[] terms = search.toLowerCase().trim().split("\\s+");
                List<Predicate> termPredicates = new ArrayList<>();
                for (String term : terms) {
                    String pattern = "%" + term + "%";
                    Join<Product, Category> catJoin = root.join("category",
                            jakarta.persistence.criteria.JoinType.LEFT);
                    Predicate nameMatch  = cb.like(cb.lower(root.get("name")), pattern);
                    Predicate sdescMatch = cb.like(cb.lower(root.get("shortDescription")), pattern);
                    Predicate descMatch  = cb.like(cb.lower(root.get("description")), pattern);
                    Predicate skuMatch   = cb.like(cb.lower(root.get("sku")), pattern);
                    Predicate catMatch   = cb.like(cb.lower(catJoin.get("name")), pattern);
                    termPredicates.add(cb.or(nameMatch, sdescMatch, descMatch, skuMatch, catMatch));
                }
                // All terms must be found somewhere in the product (AND across terms, OR across fields per term)
                predicates.add(cb.and(termPredicates.toArray(new Predicate[0])));
            }

            // Featured showcase flag filter
            if (featured != null) {
                predicates.add(cb.equal(root.get("featured"), featured));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // Determine sorting strategy — values match what the frontend select sends
        Sort sortOrder = Sort.by("createdAt").descending();
        if (sort != null && !sort.isBlank()) {
            switch (sort.toLowerCase()) {
                case "price_asc":
                case "price,asc":
                    sortOrder = Sort.by("price").ascending();
                    break;
                case "price_desc":
                case "price,desc":
                    sortOrder = Sort.by("price").descending();
                    break;
                case "rating_desc":
                case "rating,desc":
                    // No rating column on Product — sort by newest as fallback
                    sortOrder = Sort.by("createdAt").descending();
                    break;
                case "newest":
                default:
                    sortOrder = Sort.by("createdAt").descending();
                    break;
            }
        }

        Pageable pageable = PageRequest.of(page, size, sortOrder);
        Page<Product> products = productRepository.findAll(spec, pageable);

        // Map and resolve vendor store names (caching locally to avoid duplicate HTTP calls)
        Map<Long, String> vendorStoreMap = new HashMap<>();
        return products.map(product -> {
            String storeName = vendorStoreMap.computeIfAbsent(product.getVendorId(), this::getStoreName);
            return mapToProductCardResponse(product, storeName);
        });
    }

    @Override
    public Page<ProductCardResponse> getVendorProducts(Long userId, int page, int size) {
        Long vendorId = getVendorIdFromUserId(userId);
        String storeName = getStoreName(vendorId);

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Product> products = productRepository.findByVendorId(vendorId, pageable);

        return products.map(product -> mapToProductCardResponse(product, storeName));
    }

    // ─────────────────────────────────────────────────────────────
    // INTERNAL / ADMIN CATALOG OPERATIONS
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "product_detail_id", key = "#id"),
        @CacheEvict(value = "product_detail_slug", allEntries = true)
    })
    public void adminDeactivateProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
        product.setActive(false);
        productRepository.save(product);
        log.info("Admin deactivated product ID: {}", id);
    }

    @Override
    @Transactional
    @Caching(evict = {
        @CacheEvict(value = "product_detail_id", key = "#id"),
        @CacheEvict(value = "product_detail_slug", allEntries = true)
    })
    public void adminDeleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
        productRepository.delete(product);
        log.info("Admin deleted product ID: {}", id);
    }

    @Override
    public long getProductCountByVendorId(Long vendorId) {
        return productRepository.countByVendorId(vendorId);
    }

    @Override
    @Transactional
    public ProductDetailResponse reduceStock(Long productId, int quantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        if (product.getStockQuantity() < quantity) {
            throw new BadRequestException("Insufficient inventory stock for product: " + product.getName() 
                    + ". Available: " + product.getStockQuantity() + ", Requested: " + quantity);
        }

        product.setStockQuantity(product.getStockQuantity() - quantity);
        product = productRepository.save(product);
        log.info("Reduced stock for product: {}. New stock: {}", productId, product.getStockQuantity());
        // Avoid an unnecessary vendor-service HTTP call — the internal caller (InternalProductController)
        // discards the ProductDetailResponse entirely and returns only a MessageResponse.
        // Use a blank store name placeholder here; the response is never used externally.
        return mapToProductDetailResponse(product, "Store #" + product.getVendorId());
    }

    // ─────────────────────────────────────────────────────────────
    // PRODUCT REVIEWS LOGIC
    // ─────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public ReviewResponse createReview(Long userId, Long productId, ReviewRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + productId));

        // Prevent multiple reviews on the same product from a customer
        if (productReviewRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new BadRequestException("You have already submitted a review for this product");
        }

        // TODO: In Phase 5 (Order Service), verify the customer actually purchased and received this product

        ProductReview review = ProductReview.builder()
                .product(product)
                .userId(userId)
                .rating(request.getRating())
                .title(request.getTitle())
                .body(request.getBody())
                .build();

        review = productReviewRepository.save(review);
        log.info("Added product review. Product ID: {}, User ID: {}", productId, userId);
        return mapToReviewResponse(review, getUserName(userId));
    }

    @Override
    public Page<ReviewResponse> getProductReviews(Long productId, Pageable pageable) {
        Page<ProductReview> reviews = productReviewRepository.findByProductId(productId, pageable);
        Map<Long, String> userNameCache = new HashMap<>();

        return reviews.map(review -> {
            String userName = userNameCache.computeIfAbsent(review.getUserId(), this::getUserName);
            return mapToReviewResponse(review, userName);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // INTER-SERVICE HTTP COMMUNICATORS
    // ─────────────────────────────────────────────────────────────

    private Long getVendorIdFromUserId(Long userId) {
        try {
            String url = vendorServiceUrl + "/api/internal/vendors/by-user/" + userId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("id")) {
                String status = (String) response.getBody().get("status");
                if (!"APPROVED".equals(status)) {
                    throw new BadRequestException("Your vendor store application has not been approved yet. Status: " + status);
                }
                return ((Number) response.getBody().get("id")).longValue();
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to fetch vendorId for userId {} from Vendor Service: {}", userId, e.getMessage());
            throw new BadRequestException("Could not verify vendor account details. Please try again later.");
        }
        throw new BadRequestException("Vendor registration profile not found for user");
    }

    private String getStoreName(Long vendorId) {
        try {
            // Note: Directly queries vendor-service internal endpoint
            String url = vendorServiceUrl + "/api/internal/vendors/" + vendorId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("storeName")) {
                return (String) response.getBody().get("storeName");
            }
        } catch (Exception e) {
            log.warn("Failed to fetch storeName for vendorId {}: {}", vendorId, e.getMessage());
        }
        return "Store #" + vendorId;
    }

    private String getUserName(Long userId) {
        try {
            String url = authServiceUrl + "/api/internal/users/" + userId;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getBody() != null && response.getBody().containsKey("name")) {
                return (String) response.getBody().get("name");
            }
        } catch (Exception e) {
            log.warn("Failed to fetch userName for userId {}: {}", userId, e.getMessage());
        }
        return "Customer";
    }

    // ─────────────────────────────────────────────────────────────
    // MAPPER & FORMATTER HELPERS
    // ─────────────────────────────────────────────────────────────

    private CategoryResponse mapToCategoryResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .iconUrl(category.getIconUrl())
                .active(category.isActive())
                .createdAt(category.getCreatedAt())
                .build();
    }

    private ProductCardResponse mapToProductCardResponse(Product product, String storeName) {
        // Find the primary product image URL, or default to first image in listing
        String primaryUrl = null;
        if (product.getImages() != null && !product.getImages().isEmpty()) {
            primaryUrl = product.getImages().stream()
                    .filter(ProductImage::isPrimary)
                    .map(ProductImage::getImageUrl)
                    .findFirst()
                    .orElse(product.getImages().get(0).getImageUrl());
        }

        // Calculate rating metrics
        double avgRating = calculateAverageRating(product.getId());
        // Use count query — avoids loading all review rows into memory just to call .size()
        int reviewsCount = (int) productReviewRepository.countByProductId(product.getId());

        return ProductCardResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .shortDescription(product.getShortDescription())
                .price(product.getPrice())
                .compareAtPrice(product.getCompareAtPrice())
                .stockQuantity(product.getStockQuantity())
                .primaryImageUrl(primaryUrl)
                .categoryName(product.getCategory().getName())
                .vendorId(product.getVendorId())
                .vendorStoreName(storeName)
                .active(product.isActive())
                .averageRating(avgRating)
                .reviewCount(reviewsCount)
                .build();
    }

    private ProductDetailResponse mapToProductDetailResponse(Product product, String storeName) {
        List<ProductImageResponse> imgs = product.getImages().stream()
                .map(i -> ProductImageResponse.builder()
                        .id(i.getId())
                        .imageUrl(i.getImageUrl())
                        .isPrimary(i.isPrimary())
                        .displayOrder(i.getDisplayOrder())
                        .build())
                .collect(Collectors.toList());

        double avgRating = calculateAverageRating(product.getId());
        // Use count query — avoids loading all review rows into memory just to call .size()
        int reviewsCount = (int) productReviewRepository.countByProductId(product.getId());

        return ProductDetailResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .shortDescription(product.getShortDescription())
                .description(product.getDescription())
                .category(mapToCategoryResponse(product.getCategory()))
                .price(product.getPrice())
                .compareAtPrice(product.getCompareAtPrice())
                .stockQuantity(product.getStockQuantity())
                .sku(product.getSku())
                .active(product.isActive())
                .featured(product.isFeatured())
                .images(imgs)
                .vendorId(product.getVendorId())
                .vendorStoreName(storeName)
                .averageRating(avgRating)
                .reviewCount(reviewsCount)
                .build();
    }

    private ReviewResponse mapToReviewResponse(ProductReview review, String userName) {
        return ReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProduct().getId())
                .userId(review.getUserId())
                .userName(userName)
                .rating(review.getRating())
                .title(review.getTitle())
                .body(review.getBody())
                .createdAt(review.getCreatedAt())
                .build();
    }

    private double calculateAverageRating(Long productId) {
        List<ProductReview> reviews = productReviewRepository.findByProductId(productId);
        if (reviews.isEmpty()) {
            return 0.0;
        }
        double sum = reviews.stream().mapToInt(ProductReview::getRating).sum();
        // Round to one decimal place
        return Math.round((sum / reviews.size()) * 10.0) / 10.0;
    }

    private String generateSlug(String input) {
        if (input == null || input.isBlank()) {
            return UUID.randomUUID().toString();
        }
        String slug = input.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "") // Remove special characters
                .replaceAll("\\s+", "-")          // Replace spaces with hyphens
                .replaceAll("-+", "-")            // Deduplicate hyphens
                .trim();
        if (slug.endsWith("-")) {
            slug = slug.substring(0, slug.length() - 1);
        }
        return slug;
    }
}
