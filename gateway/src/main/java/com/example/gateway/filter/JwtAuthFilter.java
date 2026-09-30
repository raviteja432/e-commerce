package com.example.gateway.filter;

import com.example.gateway.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.function.HandlerFilterFunction;
import org.springframework.web.servlet.function.HandlerFunction;
import org.springframework.web.servlet.function.ServerRequest;
import org.springframework.web.servlet.function.ServerResponse;

/**
 * Spring Cloud Gateway MVC filter that:
 *  1. Checks the Authorization: Bearer <token> header on every incoming request.
 *  2. Validates the JWT signature and expiry.
 *  3. If valid, extracts userId and role from the token claims and injects them
 *     as X-User-Id and X-User-Role headers forwarded to downstream services.
 *  4. If invalid or absent, responds immediately with HTTP 401 Unauthorized.
 *
 * Applied selectively to protected routes in GatewayConfig.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthFilter implements HandlerFilterFunction<ServerResponse, ServerResponse> {

    private final JwtUtil jwtUtil;

    @Override
    public ServerResponse filter(ServerRequest request, HandlerFunction<ServerResponse> next)
            throws Exception {

        String authHeader = request.headers().firstHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Missing or malformed Authorization header for path: {}", request.path());
            return ServerResponse.status(HttpStatus.UNAUTHORIZED)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"message\": \"Authorization header missing or malformed\"}");
        }

        String token = authHeader.substring(7);

        if (!jwtUtil.validateToken(token)) {
            log.warn("Invalid or expired JWT for path: {}", request.path());
            return ServerResponse.status(HttpStatus.UNAUTHORIZED)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"message\": \"Invalid or expired token\"}");
        }

        Long userId = jwtUtil.extractUserId(token);
        String role = jwtUtil.extractRole(token);

        log.debug("JWT validated — userId={}, role={}, path={}", userId, role, request.path());

        // Mutate the request to inject identity headers for downstream services
        ServerRequest mutatedRequest = ServerRequest.from(request)
                .header("X-User-Id", userId != null ? userId.toString() : "")
                .header("X-User-Role", role != null ? role : "")
                .build();

        return next.handle(mutatedRequest);
    }
}
