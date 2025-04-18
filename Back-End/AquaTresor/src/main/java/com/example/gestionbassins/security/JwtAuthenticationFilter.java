package com.example.gestionbassins.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.exceptions.TokenExpiredException;

import java.io.IOException;
import org.springframework.stereotype.Component;

@Component 
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain)
            throws ServletException, IOException {
        
        try {
            // Votre logique de validation du token ici
            filterChain.doFilter(request, response);
            
        } catch (JWTVerificationException ex) {
            if (ex instanceof TokenExpiredException) {
                handleExpiredToken(request, response, filterChain);
            } else {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Token JWT invalide");
            }
        }
    }

    private void handleExpiredToken(HttpServletRequest request,
                                  HttpServletResponse response,
                                  FilterChain filterChain)
            throws IOException, ServletException {
        if (request.getRequestURI().startsWith("/api/panier") &&
            !request.getRequestURI().equals("/api/panier/migrate")) {
            SecurityContextHolder.clearContext();
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Token JWT expiré");
        }
    }
}