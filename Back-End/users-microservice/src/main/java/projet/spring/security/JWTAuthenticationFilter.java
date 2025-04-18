package projet.spring.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import projet.spring.entities.User;
import projet.spring.service.UserService;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;

import java.util.*;


public class JWTAuthenticationFilter extends UsernamePasswordAuthenticationFilter {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;

    public JWTAuthenticationFilter(AuthenticationManager authenticationManager, UserService userService) {
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        setFilterProcessesUrl("/users/login");
    }

    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) 
            throws AuthenticationException {
        try {
            Map<String, String> creds = new ObjectMapper().readValue(request.getInputStream(), Map.class);
            String username = creds.get("username");
            String password = creds.get("password");
            
            return authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
            );
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, 
            FilterChain chain, Authentication authResult) throws IOException {
        org.springframework.security.core.userdetails.User springUser = 
            (org.springframework.security.core.userdetails.User) authResult.getPrincipal();
        
        User user = userService.findUserByUsername(springUser.getUsername());
        
        List<String> roles = springUser.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .toList();
        
        String jwt = JWT.create()
            .withSubject(springUser.getUsername())
            .withClaim("userId", user.getUser_id())
            .withClaim("email", user.getEmail()) // Ajout de l'email
            .withClaim("profileImage", user.getProfileImage()) // Optionnel: image de profil
            .withArrayClaim("roles", roles.toArray(new String[0]))
            .withExpiresAt(new Date(System.currentTimeMillis() + SecParams.EXP_TIME))
            .sign(Algorithm.HMAC256(SecParams.SECRET));
        
        response.addHeader("Authorization", SecParams.PREFIX + jwt);
        response.addHeader("Access-Control-Expose-Headers", "Authorization");
        
        // Ajoutez aussi l'email dans la réponse si nécessaire
        response.setHeader("X-User-Email", user.getEmail());
    }
}