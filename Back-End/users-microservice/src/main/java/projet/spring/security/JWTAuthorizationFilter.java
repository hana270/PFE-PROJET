package projet.spring.security;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class JWTAuthorizationFilter extends OncePerRequestFilter {

	// JWTAuthorizationFilter.java

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
	        throws ServletException, IOException {
	    
	    // Skip filter for CORS preflight requests
	    if (request.getMethod().equals("OPTIONS")) {
	        filterChain.doFilter(request, response);
	        return;
	    }
	    
	    String jwt = extractJwtFromRequest(request);
	    
	    // If no token, continue the filter chain without authentication
	    if (jwt == null) {
	        filterChain.doFilter(request, response);
	        return;
	    }
	    
	    try {
	        // Verify and parse JWT token
	        JWTVerifier verifier = JWT.require(Algorithm.HMAC256(SecParams.SECRET)).build();
	        DecodedJWT decodedJWT = verifier.verify(jwt);
	        
	        String username = decodedJWT.getSubject();
	        List<String> roles = decodedJWT.getClaim("roles").asList(String.class);
	        
	        // Convert roles to Spring Security authorities
	        Collection<GrantedAuthority> authorities = new ArrayList<>();
	        for (String role : roles) {
	            authorities.add(new SimpleGrantedAuthority(role));
	        }
	        
	        // Create authentication token
	        UsernamePasswordAuthenticationToken authentication = 
	            new UsernamePasswordAuthenticationToken(username, null, authorities);
	        
	        // Set authentication in the context
	        SecurityContextHolder.getContext().setAuthentication(authentication);
	        
	    } catch (Exception e) {
	        // Log error but do not expose details in response
	        logger.error("JWT Authentication error: " + e.getMessage());
	        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
	        return;
	    }
	    
	    // Continue filter chain
	    filterChain.doFilter(request, response);
	}

	private String extractJwtFromRequest(HttpServletRequest request) {
	    String authHeader = request.getHeader(SecParams.JWT_HEADER);
	    
	    if (authHeader != null && authHeader.startsWith(SecParams.PREFIX)) {
	        return authHeader.substring(SecParams.PREFIX.length());
	    }
	    
	    // Also check query parameter for token (optional)
	    String token = request.getParameter("token");
	    if (token != null && !token.isEmpty()) {
	        return token;
	    }
	    
	    return null;
	}
    
   
}