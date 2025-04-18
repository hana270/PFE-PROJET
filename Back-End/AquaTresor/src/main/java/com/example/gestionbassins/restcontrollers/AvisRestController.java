package com.example.gestionbassins.restcontrollers;

import com.example.gestionbassins.entities.Avis;
import com.example.gestionbassins.entities.Avis.HistoriqueModification;
import com.example.gestionbassins.repos.AvisRepository;
import com.example.gestionbassins.security.JwtTokenService;
import com.example.gestionbassins.service.AvisService;
import com.example.gestionbassins.service.AvisServiceImpl;


import jakarta.servlet.http.HttpServletRequest; 

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.rest.webmvc.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;


import java.util.*;

//Add this import at the top of the file
import org.slf4j.Logger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/avis")
@CrossOrigin(origins = "http://localhost:4200")
public class AvisRestController {
	 @Autowired
	    private AvisService avisService;
	    
	    @Autowired
	    private AvisRepository avisRepository;
	    
	    @Autowired
	    private JwtTokenService jwtTokenService;
	  
	    
	    
    private static final Logger logger = LoggerFactory.getLogger(AvisServiceImpl.class);

    // Méthode pour obtenir l'ID de l'utilisateur courant
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        
        try {
            // Get the JWT token from the authentication object
            Object credentials = authentication.getCredentials();
            if (credentials instanceof String) {
                String jwt = (String) credentials;
                return jwtTokenService.getUserIdFromToken(jwt);
            }
            
            // Fallback: try to get from request header
            HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
                .getRequest();
            String authHeader = request.getHeader("Authorization");
            
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String jwt = authHeader.substring(7);
                return jwtTokenService.getUserIdFromToken(jwt);
            }
        } catch (Exception e) {
            logger.error("Error extracting user ID from token: {}", e.getMessage());
        }
        
        return null;
    }
    @GetMapping("/bassin/{idBassin}")
    public List<Avis> getAvisByBassinId(@PathVariable Long idBassin) {
        return avisService.getAvisByBassinId(idBassin);
    }

    @PostMapping("/add/{idBassin}")
    public ResponseEntity<Avis> addAvis(@PathVariable Long idBassin, @RequestBody Avis avis) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = avis.getNom(); // Utilisez le nom fourni dans la requête
        boolean isAuthenticated = false;

        // Si l'utilisateur est connecté, utilisez son nom d'utilisateur à la place
        if (authentication != null && authentication.isAuthenticated() &&
            !(authentication instanceof AnonymousAuthenticationToken)) {
            username = authentication.getName();
            isAuthenticated = true;
        }

        // Si le nom est vide et l'utilisateur n'est pas authentifié, renvoyer une erreur
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Avis newAvis = avisService.addAvis(avis, idBassin, username, isAuthenticated);
        return ResponseEntity.ok(newAvis);
    }

    @PutMapping("/update/{idAvis}")
    public ResponseEntity<?> updateAvis(
        @PathVariable Long idAvis, 
        @RequestBody Avis updatedAvis) {
        
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String currentUsername = authentication.getName();
            
            Avis existingAvis = avisRepository.findById(idAvis)
                .orElseThrow(() -> new ResourceNotFoundException("Avis non trouvé"));

            // Vérification d'autorisation
            if (!existingAvis.getNom().equals(currentUsername)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Vous n'êtes pas autorisé à modifier cet avis"));
            }

            // Créer l'entrée d'historique
            HistoriqueModification historique = new HistoriqueModification();
            historique.setAncienMessage(existingAvis.getMessage());
            historique.setAncienneNote(existingAvis.getNote());
            historique.setAncienNom(existingAvis.getNom());
            historique.setDateModification(new Date());

            // Mettre à jour l'avis
            existingAvis.setMessage(updatedAvis.getMessage());
            existingAvis.setNote(updatedAvis.getNote());
            existingAvis.setDateModification(new Date());
            
            // Ajouter à l'historique
            if (existingAvis.getHistoriqueModifications() == null) {
                existingAvis.setHistoriqueModifications(new ArrayList<>());
            }
            existingAvis.getHistoriqueModifications().add(historique);
            
            Avis savedAvis = avisRepository.save(existingAvis);
            return ResponseEntity.ok(savedAvis);
            
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            logger.error("Erreur lors de la mise à jour de l'avis", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Une erreur est survenue lors de la mise à jour"));
        }
    }
    
    @DeleteMapping("/delete/{idAvis}")
    public ResponseEntity<?> deleteAvis(@PathVariable Long idAvis) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Authentication required"));
            }
            
            String username = authentication.getName();
            Long currentUserId = getCurrentUserId();
            
            Avis avis = avisRepository.findById(idAvis)
                .orElseThrow(() -> new ResourceNotFoundException("Avis not found"));
            
            // Check if user is admin
            boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ADMIN"));
            
            // Check if user is the author (by username or user ID)
            boolean isAuthor = username.equals(avis.getNom()) || 
                             (currentUserId != null && currentUserId.equals(avis.getUserId()));
            
            if (!isAuthor && !isAdmin) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Unauthorized to delete this review"));
            }
            
            avisRepository.delete(avis);
            return ResponseEntity.ok().body(Map.of("message", "Review deleted successfully"));
            
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error deleting review", e);
            return ResponseEntity.internalServerError()
                .body(Map.of("message", "Error deleting review"));
        }
    }
    
    @GetMapping("/all")
    public List<Avis> getAllAvis() {
        return avisService.getAllAvis();
    }
}