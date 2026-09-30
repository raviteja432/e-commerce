package com.ecommerce.product.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.UUID;

/**
 * Service to handle product image uploads.
 *
 * Strategy:
 *  1. Attempt to upload to AWS S3 and return a pre-signed URL (7 days).
 *  2. If S3 upload fails (e.g. bucket ACL disabled, credentials invalid, network error),
 *     fall back to saving the file on the local filesystem under
 *     {upload.dir}/products/ and returning a local HTTP URL.
 *
 * The local file storage is served by Spring's static resource handler
 * via the /uploads/** path configured in application.properties.
 */
@Service
@Slf4j
public class S3Service {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucketName}")
    private String bucketName;

    @Value("${aws.region}")
    private String region;

    @Value("${upload.dir:uploads}")
    private String uploadDir;

    @Value("${server.base-url:http://localhost:8083}")
    private String serverBaseUrl;

    public S3Service(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }

    /**
     * Uploads a multipart file. Returns an S3 pre-signed URL if successful,
     * otherwise falls back to local storage and returns a local URL.
     */
    public String uploadFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload an empty file");
        }

        String fileExtension = getFileExtension(file.getOriginalFilename());
        String uniqueFilename = UUID.randomUUID() + (fileExtension.isEmpty() ? "" : "." + fileExtension);

        // ── Attempt 1: Upload to S3 ──────────────────────────────────────────
        try {
            String s3Key = "products/" + uniqueFilename;

            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putRequest,
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            log.info("Uploaded to S3: key={}", s3Key);

            // Generate a 7-day pre-signed GET URL
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofDays(7))
                    .getObjectRequest(getRequest)
                    .build();

            PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
            String presignedUrl = presigned.url().toString();

            // Verify the URL is actually accessible (quick HEAD check)
            if (isUrlAccessible(presignedUrl)) {
                log.info("S3 pre-signed URL is accessible. Returning S3 URL.");
                return presignedUrl;
            } else {
                log.warn("S3 pre-signed URL returned 403/non-200. Bucket likely has Block Public Access enabled. " +
                         "Falling back to local storage.");
            }

        } catch (Exception e) {
            log.warn("S3 upload failed ({}). Falling back to local storage.", e.getMessage());
        }

        // ── Attempt 2: Save locally ──────────────────────────────────────────
        return saveLocally(file, uniqueFilename);
    }

    /**
     * Saves the file to the local filesystem and returns a publicly accessible URL.
     */
    private String saveLocally(MultipartFile file, String filename) {
        try {
            Path uploadPath = Paths.get(uploadDir, "products");
            Files.createDirectories(uploadPath);

            Path filePath = uploadPath.resolve(filename);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
            }

            String localUrl = serverBaseUrl + "/uploads/products/" + filename;
            log.info("Saved image locally. URL: {}", localUrl);
            return localUrl;

        } catch (IOException e) {
            log.error("Local file save also failed", e);
            throw new RuntimeException("Image upload failed: could not save to S3 or local storage. " + e.getMessage(), e);
        }
    }

    /**
     * Quick accessibility check for an S3 URL.
     */
    private boolean isUrlAccessible(String url) {
        try {
            java.net.HttpURLConnection connection = (java.net.HttpURLConnection)
                    new java.net.URL(url).openConnection();
            connection.setRequestMethod("HEAD");
            connection.setConnectTimeout(3000);
            connection.setReadTimeout(3000);
            int code = connection.getResponseCode();
            connection.disconnect();
            return code >= 200 && code < 300;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Extracts the file extension from a filename.
     */
    private String getFileExtension(String filename) {
        if (filename == null || filename.lastIndexOf(".") == -1) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1);
    }
}
