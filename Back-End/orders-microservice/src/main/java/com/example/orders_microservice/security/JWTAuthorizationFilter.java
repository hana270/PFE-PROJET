package com.example.orders_microservice.security;

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
import com.auth0.jwt.exceptions.JWTDecodeException;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;

public class JWTAuthorizationFilter extends OncePerRequestFilter {

	// In JWTAuthorizationFilter.java
	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) 
	    throws IOException, ServletException {
	    try {
	        String jwt = request.getHeader("Authorization");
	        
	        // Skip JWT validation for session-based requests
	        if (jwt == null || jwt.isEmpty()) {
	            chain.doFilter(request, response);
	            return;
	        }

	        // Ensure proper Bearer token format
	        if (!jwt.startsWith(SecParams.PREFIX)) {
	            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Authorization header format");
	            return;
	        }

	        jwt = jwt.substring(SecParams.PREFIX.length()).trim();
	        
	        try {
	            DecodedJWT decodedJWT = JWT.require(Algorithm.HMAC256(SecParams.SECRET)).build().verify(jwt);
	            
	            if (decodedJWT.getSubject() == null || decodedJWT.getSubject().isEmpty()) {
	                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token: missing subject");
	                return;
	            }
	            
	            // Extract claims safely
	            String username = decodedJWT.getSubject();
	            String email = decodedJWT.getClaim("email").asString();
	            Long userId = decodedJWT.getClaim("userId").asLong();
	            List<String> roles = decodedJWT.getClaim("roles").asList(String.class);

	            Collection<GrantedAuthority> authorities = new ArrayList<>();
	            for (String role : roles) {
	                authorities.add(new SimpleGrantedAuthority(role));
	            }

	            CustomUserDetails userDetails = new CustomUserDetails(
	                userId, 
	                username, 
	                email,
	                authorities
	            );

	            UsernamePasswordAuthenticationToken authentication = 
	                new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
	            
	            SecurityContextHolder.getContext().setAuthentication(authentication);
	        } catch (JWTVerificationException e) {
	            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
	            return;
	        }
	    } catch (Exception e) {
	        SecurityContextHolder.clearContext();
	        response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Authentication error");
	        return;
	    }

	    chain.doFilter(request, response);
	}
}