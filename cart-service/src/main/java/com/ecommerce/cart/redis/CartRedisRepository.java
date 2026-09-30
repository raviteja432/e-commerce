package com.ecommerce.cart.redis;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Repository class wrapping Redis Hash operations for Cart data.
 * Redis Key format: cart:{userId}
 * Hash Field: productId (String)
 * Hash Value: quantity (String)
 * TTL: 7 Days
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class CartRedisRepository {

    private final StringRedisTemplate redisTemplate;
    private static final long CART_TTL_DAYS = 7;

    private String getCartKey(Long userId) {
        return "cart:" + userId;
    }

    /**
     * Adds or updates a product in the user's cart in Redis.
     */
    public void addItem(Long userId, Long productId, int quantity) {
        String key = getCartKey(userId);
        redisTemplate.opsForHash().put(key, productId.toString(), String.valueOf(quantity));
        redisTemplate.expire(key, CART_TTL_DAYS, TimeUnit.DAYS);
        log.info("Redis: Set item productId={} qty={} in cart for userId={}", productId, quantity, userId);
    }

    /**
     * Retrieves all items in the user's cart from Redis.
     * Returns a map of productId (String) -> quantity (String).
     */
    public Map<Object, Object> getCartItems(Long userId) {
        String key = getCartKey(userId);
        return redisTemplate.opsForHash().entries(key);
    }

    /**
     * Removes a single product from the user's cart in Redis.
     */
    public void removeItem(Long userId, Long productId) {
        String key = getCartKey(userId);
        redisTemplate.opsForHash().delete(key, productId.toString());
        log.info("Redis: Removed item productId={} from cart for userId={}", productId, userId);
    }

    /**
     * Clears all items in the user's cart from Redis.
     */
    public void clearCart(Long userId) {
        String key = getCartKey(userId);
        redisTemplate.delete(key);
        log.info("Redis: Cleared cart for userId={}", userId);
    }

    /**
     * Checks if a cart exists in Redis for the given userId.
     */
    public boolean hasCart(Long userId) {
        String key = getCartKey(userId);
        Boolean exists = redisTemplate.hasKey(key);
        return Boolean.TRUE.equals(exists);
    }
}
