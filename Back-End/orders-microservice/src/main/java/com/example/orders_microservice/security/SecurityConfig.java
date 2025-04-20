package com.example.orders_microservice.security;

import java.io.*;
import java.util.*;
import java.util.Collections;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled= true)
public class SecurityConfig {

    
    @Bean
    public JWTAuthorizationFilter jwtAuthorizationFilter() {
        return new JWTAuthorizationFilter();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .addFilterBefore(jwtAuthorizationFilter(), UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
	       
	    
	            
	            //Panier
	            .requestMatchers("/api/panier/**").permitAll()
	            .requestMatchers("/api/panier/items").permitAll()
	            .requestMatchers("/api/panier/items/{itemId}").permitAll()
	            .requestMatchers("/api/panier/user/{user_id}").permitAll()
	            .requestMatchers("/api/panier/user/{user_id}/add").permitAll()
	            .requestMatchers("/api/panier/migrate").permitAll()
	            .requestMatchers("/api/panier/**").permitAll()
	            .requestMatchers("/api/panier/items/**").permitAll()
	            
	            // Panier - permettre l'accès anonyme
                .requestMatchers(HttpMethod.GET, "/api/panier/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/panier/**").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/panier/**").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/panier/**").permitAll()
                
               // For non-archived items
	            .requestMatchers("/api/non-archives").hasAuthority("ADMIN")
	            .anyRequest().permitAll()
	        );

	    // Add JWT filter before UsernamePasswordAuthenticationFilter
        http.addFilterBefore(new JWTAuthorizationFilter(), UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
	}
	
	 public CorsConfigurationSource corsConfigurationSource() {
	        CorsConfiguration configuration = new CorsConfiguration();
	        configuration.setAllowedOrigins(Arrays.asList("http://localhost:4200"));
	        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
	        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "X-Session-ID"));
	        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Session-ID"));
	        configuration.setAllowCredentials(true);
	        configuration.setMaxAge(3600L);

	        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
	        source.registerCorsConfiguration("/**", configuration);
	        return source;
	    }
}