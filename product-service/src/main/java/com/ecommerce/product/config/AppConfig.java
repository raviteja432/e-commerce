package com.ecommerce.product.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Global application configuration.
 * Declares bean definitions and MVC resource handler for uploaded images.
 */
@Configuration
public class AppConfig implements WebMvcConfigurer {

    @Value("${upload.dir:uploads}")
    private String uploadDir;

    /**
     * Configures the RestTemplate bean used for HTTP communication
     * between this Product Service and the Auth/Vendor Services.
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    /**
     * Exposes the local upload directory as a static resource endpoint.
     * Images saved to {upload.dir}/products/xxx.png are served at:
     *   http://localhost:8083/uploads/products/xxx.png
     * which is proxied through the gateway at:
     *   http://localhost:8080/uploads/products/xxx.png
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath();
        String resourceLocation = "file:///" + uploadPath.toString().replace("\\", "/") + "/";

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(resourceLocation)
                .setCachePeriod(86400); // Cache for 1 day
    }

    /**
     * Initializes default product categories in the database on startup.
     */
    @Bean
    public org.springframework.boot.CommandLineRunner initCategories(com.ecommerce.product.repository.CategoryRepository categoryRepository) {
        return args -> {
            String[][] initialCategories = {
                {"Fashion", "fashion"},
                {"Electronics", "electronics"},
                {"Mobiles", "mobiles"},
                {"Home Decor", "home-decor"},
                {"Laptop", "laptop"},
                {"TV", "tv"},
                {"Appliances", "appliances"},
                {"Beauty & Personal Care", "beauty-personal-care"}
            };

            for (String[] catData : initialCategories) {
                String name = catData[0];
                String slug = catData[1];
                if (!categoryRepository.existsByName(name)) {
                    com.ecommerce.product.entity.Category cat = com.ecommerce.product.entity.Category.builder()
                            .name(name)
                            .slug(slug)
                            .active(true)
                            .build();
                    categoryRepository.save(cat);
                }
            }
        };
    }
}
