package projet.spring.security;

import java.io.IOException;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import projet.spring.entities.Role;
import projet.spring.service.UserService;

public class JWTAuthenticationFilter extends UsernamePasswordAuthenticationFilter {

    private AuthenticationManager authenticationManager;
    private UserService userService;

    public JWTAuthenticationFilter(AuthenticationManager authenticationManager, UserService userService) {
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        super.setFilterProcessesUrl("/users/login"); // URL configurée explicitement
    }

    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response)
            throws AuthenticationException {

        // Log pour débogage
        System.out.println("Tentative d'authentification en cours...");

        projet.spring.entities.User user = null;

        try {
            user = new ObjectMapper().readValue(request.getInputStream(), projet.spring.entities.User.class);
            System.out.println("Authentification pour l'utilisateur: " + user.getUsername());
        } catch (Exception e) {
            System.out.println("Erreur lors de la lecture du corps de la requête: " + e.getMessage());
            throw new RuntimeException("Corps de requête invalide", e);
        }

        return authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), user.getPassword()));
    }

    @Override
    protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response,
                                            FilterChain chain, Authentication authResult) throws IOException, ServletException {

        System.out.println("Authentification réussie! Génération du token JWT...");

        User springUser = (User) authResult.getPrincipal();

        // Récupérer l'entité utilisateur complète avec tous les détails
        projet.spring.entities.User fullUser = userService.findUserByUsername(springUser.getUsername());

        // Extraire les rôles sous forme de chaînes
        List<String> roles = fullUser.getRoles().stream()
                .map(Role::getRole)
                .collect(Collectors.toList());

        // Construire le token JWT avec les détails de l'utilisateur
        String jwt = JWT.create()
                .withSubject(springUser.getUsername())
                .withClaim("userId", fullUser.getUser_id())
                .withClaim("email", fullUser.getEmail())
                .withClaim("username", fullUser.getUsername())
                .withClaim("firstName", fullUser.getFirstName())
                .withClaim("lastName", fullUser.getLastName())
                .withClaim("phone", fullUser.getPhone())
                .withClaim("enabled", fullUser.getEnabled())
                .withClaim("defaultAddress", fullUser.getDefaultAddress())
                .withClaim("profileImage", fullUser.getProfileImage())
                .withArrayClaim("roles", roles.toArray(new String[0]))
                .withExpiresAt(new Date(System.currentTimeMillis() + SecParams.EXP_TIME))
                .sign(Algorithm.HMAC256(SecParams.SECRET));

        String tokenWithPrefix = SecParams.PREFIX + jwt;

        // Journaliser les tokens pour le débogage
        System.out.println("JWT généré (sans préfixe): " + jwt);
        System.out.println("JWT complet (avec préfixe): " + tokenWithPrefix);

        // Créer les données utilisateur pour le corps de la réponse
        Map<String, Object> userData = new HashMap<>();
        userData.put("userId", fullUser.getUser_id());
        userData.put("username", fullUser.getUsername());
        userData.put("email", fullUser.getEmail());
        userData.put("firstName", fullUser.getFirstName());
        userData.put("lastName", fullUser.getLastName());
        userData.put("phone", fullUser.getPhone());
        userData.put("enabled", fullUser.getEnabled());
        userData.put("defaultAddress", fullUser.getDefaultAddress());
        userData.put("profileImage", fullUser.getProfileImage());
        userData.put("roles", roles);

        // Créer la réponse complète avec tous les formats de tokens requis
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("jwt", jwt);         // JWT sans le préfixe "Bearer "
        responseBody.put("token", tokenWithPrefix); // JWT avec le préfixe "Bearer "
        responseBody.put("user", userData);

        // Définir les en-têtes de réponse
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.addHeader(SecParams.JWT_HEADER, tokenWithPrefix);
        response.addHeader("Access-Control-Expose-Headers", SecParams.JWT_HEADER);

        // Écrire le corps de la réponse
        new ObjectMapper().writeValue(response.getOutputStream(), responseBody);
    }
}