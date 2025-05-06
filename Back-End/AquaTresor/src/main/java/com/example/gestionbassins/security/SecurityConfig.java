package com.example.gestionbassins.security;

import jakarta.servlet.http.HttpServletResponse;
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

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }
    
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
            .exceptionHandling(handling -> handling
                .authenticationEntryPoint((request, response, exception) -> {
                    System.out.println("Authentication Error: " + exception.getMessage());
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized");
                })
                .accessDeniedHandler((request, response, exception) -> {
                    System.out.println("Access Denied Error: " + exception.getMessage());
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access Denied");
                })
            )
            .authorizeHttpRequests(auth -> auth
                // Gestion des bassins
                .requestMatchers("/api/addbassin").hasAuthority("ADMIN")
                .requestMatchers("/api/addBassinWithImages/**").hasAuthority("ADMIN")
                .requestMatchers("/api/all").permitAll()
                .requestMatchers("/api/getbyid/**").permitAll()
                .requestMatchers("/api/imagesBassin/**").permitAll()
                .requestMatchers("/api/updateBassinWithImg/**").hasAuthority("ADMIN")
                .requestMatchers("/api/updatebassin/**").hasAuthority("ADMIN")
                .requestMatchers("/api/deletebassin/**").hasAuthority("ADMIN")
                .requestMatchers("/api/image/**").permitAll()
                .requestMatchers("/api/categories/**").permitAll()
                
                // Bassins personnalisés
                .requestMatchers("/api/bassinpersonnalise/ajouterBassinPersonnalise/**").permitAll()
                .requestMatchers("/api/bassinpersonnalise/getAllBassinPersonnalise").permitAll()
                .requestMatchers("/api/bassinpersonnalise/detailBassinPersonnalise/**").permitAll()
                .requestMatchers("/api/bassinpersonnalise/supprimerBassinPersonnalise/**").permitAll()
                .requestMatchers("/api/bassinpersonnalise/mettreAJourBassinPersonnalise/**").permitAll()
                .requestMatchers("/api/imagespersonnalise/**").permitAll()
                .requestMatchers("/api/bassinpersonnalise/options/**").permitAll()
                            
                // Gestion des avis
                .requestMatchers("/api/avis/all").permitAll()
                .requestMatchers("/api/avis/bassin/**").permitAll()
                .requestMatchers("/api/avis/add/**").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/avis/update/**").authenticated()
                .requestMatchers(HttpMethod.DELETE, "/api/avis/delete/**").authenticated()
                .requestMatchers("/api/avis/user/**").authenticated()
                
                // Gestion des promotions
                .requestMatchers("/api/promotions/add").hasAuthority("ADMIN")
                .requestMatchers("/api/promotions/bassins").permitAll()
                .requestMatchers("/api/promotions/update/**").hasAuthority("ADMIN")
                .requestMatchers("/api/promotions/applyToBassins/**").hasAuthority("ADMIN")
                .requestMatchers("/api/promotions/applyToCategorie/**").hasAuthority("ADMIN")
                .requestMatchers("/api/promotions/all").permitAll()
                .requestMatchers("/api/promotions/**").permitAll()
                .requestMatchers("/api/promotions/delete/**").hasAuthority("ADMIN")
                
                // Gestion des stocks
                .requestMatchers("/api/{id}/archiver").hasAuthority("ADMIN")
                .requestMatchers("/api/{id}/desarchiver").hasAuthority("ADMIN")
                .requestMatchers("/api/{id}/mettre-a-jour-quantite").hasAuthority("ADMIN")
                .requestMatchers("/api/non-archives").hasAuthority("ADMIN")
                .requestMatchers("/api/archives").hasAuthority("ADMIN")
                .requestMatchers("/api/transactions").hasAuthority("ADMIN")
                .requestMatchers("/api/notifier-stock-faible").hasAuthority("ADMIN")
                .requestMatchers("/api/{id}/mettre-sur-commande").hasAuthority("ADMIN")
                
                // Notifications
                .requestMatchers("/api/notifications", "/api/notifications/").permitAll()
                .requestMatchers("/api/notifications/**").permitAll()
                .requestMatchers("/api/notifications/read-all").permitAll()
                .requestMatchers("/api/notifications/{id}/read").permitAll()
                
                // Panier
                .requestMatchers("/api/panier/**").permitAll()
                .requestMatchers("/api/panier/items").permitAll()
                .requestMatchers("/api/panier/items/{itemId}").permitAll()
                .requestMatchers("/api/panier/user/{user_id}").permitAll()
                .requestMatchers("/api/panier/user/{user_id}/add").permitAll()
                .requestMatchers("/api/panier/migrate").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/panier/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/panier/**").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/panier/**").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/panier/**").permitAll()
                
                // Par défaut
                .anyRequest().permitAll()
            );

        // Ajout des filtres JWT dans le bon ordre
        http.addFilterBefore(jwtAuthorizationFilter(), UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(jwtAuthenticationFilter(), JWTAuthorizationFilter.class);
        
        return http.build();
    }
    
    @Bean
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