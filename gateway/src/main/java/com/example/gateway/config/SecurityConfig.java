package com.example.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security configuration for the API Gateway.
 *
 * Spring Security's built-in authentication is disabled — all authentication
 * and authorization is handled by the JwtAuthFilter applied to individual routes
 * in GatewayConfig. Spring Security here simply disables CSRF and form-login
 * interference so the gateway can proxy requests cleanly.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth ->
                        // Allow all — the JwtAuthFilter on each route handles auth
                        auth.anyRequest().permitAll()
                );
        return http.build();
    }
}
