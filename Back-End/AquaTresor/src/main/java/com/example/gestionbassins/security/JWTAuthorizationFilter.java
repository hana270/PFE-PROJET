package com.example.gestionbassins.security;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;

public class JWTAuthorizationFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) 
        throws IOException, ServletException {
        
        // Pour le débogage, imprimez les en-têtes
        System.out.println("Headers: " + request.getHeaderNames());
        if (request.getHeader("Authorization") != null) {
            System.out.println("Authorization header: " + request.getHeader("Authorization"));
        }
        
        try {
            String jwt = request.getHeader("Authorization");
            String sessionId = request.getHeader("X-Session-ID");
            
            // Si pas de JWT mais a un ID de session, autoriser la demande à continuer
            if ((jwt == null || !jwt.startsWith(SecParams.PREFIX)) && sessionId != null) {
                chain.doFilter(request, response);
                return;
            }
            
            // Si pas de JWT du tout, passer au filtre suivant
            if (jwt == null || !jwt.startsWith(SecParams.PREFIX)) {
                chain.doFilter(request, response);
                return;
            }
            
            jwt = jwt.substring(SecParams.PREFIX.length());
            Algorithm algorithm = Algorithm.HMAC256(SecParams.SECRET);
            JWTVerifier verifier = JWT.require(algorithm).build();
            DecodedJWT decodedJWT = verifier.verify(jwt);
            
            String username = decodedJWT.getSubject();
            String email = decodedJWT.getClaim("email").asString();
            Long userId = decodedJWT.getClaim("userId").asLong();
            
            // Impression de débogage
            System.out.println("JWT décodé - Username: " + username);
            System.out.println("JWT décodé - Email: " + email);
            System.out.println("JWT décodé - UserID: " + userId);
            
            // Extrait les rôles du token
            List<String> roles = decodedJWT.getClaim("roles").asList(String.class);
            System.out.println("Rôles extraits du JWT: " + roles);
            
            // Convertir les rôles en autorités
            Collection<GrantedAuthority> authorities = new ArrayList<>();
            if (roles != null) {
                for (String role : roles) {
                    // Assurez-vous que le rôle est non nul
                    if (role != null && !role.trim().isEmpty()) {
                        SimpleGrantedAuthority authority = new SimpleGrantedAuthority(role);
                        authorities.add(authority);
                        System.out.println("Ajout de l'autorité: " + authority.getAuthority());
                    }
                }
            }
            
            // Création d'un CustomUserDetails avec toutes les informations
            CustomUserDetails userDetails = new CustomUserDetails(
                userId, 
                username, 
                email,
                authorities
            );
            
            UsernamePasswordAuthenticationToken authentication = 
                new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
            System.out.println("Authentification réussie avec les autorités: " + authorities);
            
        } catch (Exception e) {
            System.out.println("Erreur JWT: " + e.getMessage());
            e.printStackTrace(); // Afficher la stack trace complète pour déboguer
            SecurityContextHolder.clearContext();
        }
        
        chain.doFilter(request, response);
    }
}