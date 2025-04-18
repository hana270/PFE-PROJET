package projet.spring.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.*;

public class JWTAuthorizationFilter extends OncePerRequestFilter {
	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
	        throws ServletException, IOException {
	    String jwt = request.getHeader("Authorization");

	    if (jwt == null || !jwt.startsWith(SecParams.PREFIX)) {
	        filterChain.doFilter(request, response);
	        return;
	    }

	    jwt = jwt.substring(SecParams.PREFIX.length());
	    
	    DecodedJWT decodedJWT = JWT.require(Algorithm.HMAC256(SecParams.SECRET)).build().verify(jwt);
	    String username = decodedJWT.getSubject();
	    String email = decodedJWT.getClaim("email").asString(); // Extract email
	    Long userId = decodedJWT.getClaim("userId").asLong();   // Extract userId
	    List<String> roles = decodedJWT.getClaim("roles").asList(String.class);

	   
	    
	    Collection<GrantedAuthority> authorities = new ArrayList<>();
	    for (String r : roles) {
	        authorities.add(new SimpleGrantedAuthority(r));
	    }

	    UsernamePasswordAuthenticationToken user = new UsernamePasswordAuthenticationToken(username, null, authorities);
	    SecurityContextHolder.getContext().setAuthentication(user);
	    filterChain.doFilter(request, response);
	}
}