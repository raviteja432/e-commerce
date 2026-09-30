package com.ecommerce.vendor.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

/**
 * AES-256 encryption service for sensitive vendor bank details.
 * Uses AES/CBC/PKCS5Padding with a fixed IV derived from the key.
 */
@Service
public class EncryptionService {

    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";

    @Value("${encryption.secret.key}")
    private String secretKey;

    /**
     * Encrypts plaintext using AES-256.
     * Returns Base64-encoded ciphertext, or null if input is null/blank.
     */
    public String encrypt(String plainText) {
        if (plainText == null || plainText.isBlank()) return null;
        try {
            SecretKeySpec keySpec = buildKeySpec();
            IvParameterSpec iv = buildIv();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, iv);
            byte[] encrypted = cipher.doFinal(plainText.getBytes("UTF-8"));
            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed: " + e.getMessage(), e);
        }
    }

    /**
     * Decrypts AES-256 Base64-encoded ciphertext back to plaintext.
     * Returns null if input is null/blank.
     */
    public String decrypt(String cipherText) {
        if (cipherText == null || cipherText.isBlank()) return null;
        try {
            SecretKeySpec keySpec = buildKeySpec();
            IvParameterSpec iv = buildIv();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, iv);
            byte[] decoded = Base64.getDecoder().decode(cipherText);
            return new String(cipher.doFinal(decoded), "UTF-8");
        } catch (Exception e) {
            throw new RuntimeException("Decryption failed: " + e.getMessage(), e);
        }
    }

    /**
     * Masks account number for display — shows only last 4 digits.
     * e.g. "1234567890" → "••••••7890"
     */
    public String maskAccountNumber(String decrypted) {
        if (decrypted == null || decrypted.length() < 4) return "••••";
        String last4 = decrypted.substring(decrypted.length() - 4);
        return "••••••" + last4;
    }

    // ── private helpers ──────────────────────────────────────────────────────

    private SecretKeySpec buildKeySpec() throws Exception {
        byte[] keyBytes = secretKey.getBytes("UTF-8");
        // Ensure exactly 32 bytes for AES-256
        byte[] key = new byte[32];
        System.arraycopy(keyBytes, 0, key, 0, Math.min(keyBytes.length, 32));
        return new SecretKeySpec(key, "AES");
    }

    private IvParameterSpec buildIv() throws Exception {
        // Use first 16 bytes of key as IV (fixed, deterministic)
        byte[] keyBytes = secretKey.getBytes("UTF-8");
        byte[] iv = new byte[16];
        System.arraycopy(keyBytes, 0, iv, 0, Math.min(keyBytes.length, 16));
        return new IvParameterSpec(iv);
    }
}
