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
import com.auth0.jwt.interfaces.DecodedJWT;

public class JWTAuthorizationFilter extends OncePerRequestFilter {

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) 
	    throws IOException, ServletException {
		try {
			 String jwt = request.getHeader("Authorization");
			    String sessionId = request.getHeader("X-Session-ID");
			    
			    // If no JWT but has session ID, allow request to proceed
			    if ((jwt == null || !jwt.startsWith(SecParams.PREFIX)) && sessionId != null) {
			        chain.doFilter(request, response);
			        return;
			    }

	        jwt = jwt.substring(SecParams.PREFIX.length());

	        DecodedJWT decodedJWT = JWT.require(Algorithm.HMAC256(SecParams.SECRET)).build().verify(jwt);
	        String username = decodedJWT.getSubject();
	        String email = decodedJWT.getClaim("email").asString();
	        Long userId = decodedJWT.getClaim("userId").asLong();
	        List<String> roles = decodedJWT.getClaim("roles").asList(String.class);

	        Collection<GrantedAuthority> authorities = new ArrayList<>();
	        for (String role : roles) {
	            authorities.add(new SimpleGrantedAuthority(role));
	        }

	    // Créez un CustomUserDetails avec toutes les informations
	        CustomUserDetails userDetails = new CustomUserDetails(
	            userId, 
	            username, 
	            email,
	            authorities
	        );

	        UsernamePasswordAuthenticationToken authentication = 
	            new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
	        
	        SecurityContextHolder.getContext().setAuthentication(authentication);
	    } catch (Exception e) {
	        System.out.println("Erreur JWT: " + e.getMessage());
	        SecurityContextHolder.clearContext();
	    }

		chain.doFilter(request, response);
	}
}