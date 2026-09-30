package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.ReduceStockRequest;
import com.ecommerce.product.dto.response.MessageResponse;
import com.ecommerce.product.dto.response.ProductDetailResponse;
import com.ecommerce.product.dto.response.ProductStockResponse;
import com.ecommerce.product.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller exposing endpoints for internal, inter-service communication.
 * These endpoints are accessed directly by other microservices and are not routed through the API Gateway.
 */
@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalProductController {

    private final ProductService productService;

    /**
     * Checks current stock and price details of a specific product.
     * Called by Cart Service and Order Service.
     */
    @GetMapping("/products/{id}/stock")
    public ResponseEntity<ProductStockResponse> getProductStock(@PathVariable Long id) {
        ProductDetailResponse product = productService.getProductById(id);
        
        ProductStockResponse stockResponse = ProductStockResponse.builder()
                .productId(product.getId())
                .productName(product.getName())
                .stockQuantity(product.getStockQuantity())
                .price(product.getPrice())
                .vendorId(product.getVendorId())
                .build();
                
        return ResponseEntity.ok(stockResponse);
    }

    /**
     * Deducts inventory stock for a product when an order is placed.
     * Called by Order Service.
     */
    @PutMapping("/products/{id}/stock/reduce")
    public ResponseEntity<MessageResponse> reduceStock(
            @PathVariable Long id,
            @Valid @RequestBody ReduceStockRequest request) {
        productService.reduceStock(id, request.getQuantity());
        return ResponseEntity.ok(new MessageResponse("Stock successfully reduced"));
    }

    /**
     * Retrieves the total count of products listed by a vendor.
     * Called by Vendor Service for dashboard statistics.
     */
    @GetMapping("/vendors/{vendorId}/products/count")
    public ResponseEntity<Map<String, Long>> getVendorProductCount(@PathVariable Long vendorId) {
        long count = productService.getProductCountByVendorId(vendorId);
        return ResponseEntity.ok(Map.of("count", count));
    }
}
