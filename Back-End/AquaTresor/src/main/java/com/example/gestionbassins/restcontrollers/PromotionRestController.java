package com.example.gestionbassins.restcontrollers;

import com.example.gestionbassins.dto.PromotionDTO;
import com.example.gestionbassins.dto.UpdatePromotionDTO;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.Categorie;
import com.example.gestionbassins.entities.Promotion;
import com.example.gestionbassins.service.BassinService;
import com.example.gestionbassins.service.CategorieService;
import com.example.gestionbassins.service.PromotionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.*;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/promotions")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:2400"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
public class PromotionRestController {

    @Autowired
    private PromotionService promotionService;

    @Autowired
    private CategorieService categorieService;

    @Autowired
    private BassinService bassinService;

    @PostMapping("/add")
    public ResponseEntity<?> createPromotion(@Valid @RequestBody PromotionDTO promotionDTO, BindingResult result) {
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            for (FieldError error : result.getFieldErrors()) {
                errors.put(error.getField(), error.getDefaultMessage());
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
        }

        try {
            Promotion createdPromotion = promotionService.createPromotion(promotionDTO);
            return ResponseEntity.ok(createdPromotion);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Une erreur est survenue: " + e.getMessage());
        }
    }

    @GetMapping("/all")
    public ResponseEntity<List<Promotion>> getAllPromotions() {
        try {
            List<Promotion> promotions = promotionService.getAllPromotions();
            return ResponseEntity.ok(promotions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPromotionById(@PathVariable Long id) {
        try {
            Promotion promotion = promotionService.getPromotionById(id);
            return ResponseEntity.ok(promotion);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<?> updatePromotion(@PathVariable Long id, @Valid @RequestBody UpdatePromotionDTO promotionDTO, BindingResult result) {
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            for (FieldError error : result.getFieldErrors()) {
                errors.put(error.getField(), error.getDefaultMessage());
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
        }

        try {
            Promotion updatedPromotion = promotionService.updatePromotion(id, promotionDTO);
            return ResponseEntity.ok(updatedPromotion);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Une erreur est survenue: " + e.getMessage());
        }
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deletePromotion(@PathVariable Long id) {
        try {
            promotionService.deletePromotion(id);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Une erreur est survenue: " + e.getMessage());
        }
    }

    @PostMapping("/check-overlaps")
    public ResponseEntity<?> checkOverlaps(@RequestBody Map<String, Object> requestData) {
        try {
            // Convertir les IDs des bassins en Long
            List<Long> bassinIds = ((List<Integer>) requestData.get("bassins"))
                    .stream()
                    .map(Integer::longValue) // Convertir Integer en Long
                    .collect(Collectors.toList());

            // Convertir les IDs des catégories en Long
            List<Long> categorieIds = ((List<Integer>) requestData.get("categories"))
                    .stream()
                    .map(Integer::longValue) // Convertir Integer en Long
                    .collect(Collectors.toList());

            // Convertir les dates
            Date dateDebut = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").parse((String) requestData.get("dateDebut"));
            Date dateFin = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").parse((String) requestData.get("dateFin"));

            // Gérer promotionId (peut être null)
            final Long promotionId; // Déclarer promotionId comme final
            if (requestData.get("promotionId") != null) {
                promotionId = ((Integer) requestData.get("promotionId")).longValue(); // Convertir Integer en Long
            } else {
                promotionId = null; // Si promotionId est null, assigner null
            }

            // Vérifier les chevauchements
            Map<String, List<Map<String, Object>>> result = new HashMap<>();
            List<Map<String, Object>> overlappingBassins = new ArrayList<>();
            List<Map<String, Object>> overlappingCategories = new ArrayList<>();

            if (bassinIds != null && !bassinIds.isEmpty()) {
                for (Long bassinId : bassinIds) {
                    List<Promotion> overlaps = promotionService.getOverlappingPromotionsForBassin(bassinId, dateDebut, dateFin);
                    if (promotionId != null) {
                        overlaps = overlaps.stream()
                                .filter(p -> !p.getIdPromotion().equals(promotionId)) // Utilisation de promotionId
                                .collect(Collectors.toList());
                    }

                    if (!overlaps.isEmpty()) {
                        Bassin bassin = bassinService.getBassinById(bassinId);
                        Map<String, Object> bassinInfo = new HashMap<>();
                        bassinInfo.put("id", bassinId);
                        bassinInfo.put("nom", bassin.getNomBassin());
                        bassinInfo.put("promotions", overlaps.stream()
                                .map(p -> Map.of(
                                        "id", p.getIdPromotion(),
                                        "nom", p.getNomPromotion(),
                                        "dateDebut", p.getDateDebut(),
                                        "dateFin", p.getDateFin()
                                ))
                                .collect(Collectors.toList()));

                        overlappingBassins.add(bassinInfo);
                    }
                }
            }

            if (categorieIds != null && !categorieIds.isEmpty()) {
                for (Long categorieId : categorieIds) {
                    List<Promotion> overlaps = promotionService.getOverlappingPromotionsForCategorie(categorieId, dateDebut, dateFin);
                    if (promotionId != null) {
                        overlaps = overlaps.stream()
                                .filter(p -> !p.getIdPromotion().equals(promotionId)) // Utilisation de promotionId
                                .collect(Collectors.toList());
                    }

                    if (!overlaps.isEmpty()) {
                        Categorie categorie = categorieService.getCategorieById(categorieId);
                        Map<String, Object> categorieInfo = new HashMap<>();
                        categorieInfo.put("id", categorieId);
                        categorieInfo.put("nom", categorie.getNomCategorie());
                        categorieInfo.put("promotions", overlaps.stream()
                                .map(p -> Map.of(
                                        "id", p.getIdPromotion(),
                                        "nom", p.getNomPromotion(),
                                        "dateDebut", p.getDateDebut(),
                                        "dateFin", p.getDateFin()
                                ))
                                .collect(Collectors.toList()));

                        overlappingCategories.add(categorieInfo);
                    }
                }
            }

            result.put("bassins", overlappingBassins);
            result.put("categories", overlappingCategories);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Une erreur est survenue: " + e.getMessage());
        }
    }
    @GetMapping("/bassins")
    public ResponseEntity<List<Map<String, Object>>> getAllBassins(
            @RequestParam(required = false) Boolean includePromotions) {
        try {
            List<Bassin> bassins = bassinService.getAllBassins();
            List<Map<String, Object>> result = new ArrayList<>();
            
            for (Bassin bassin : bassins) {
                Map<String, Object> bassinMap = new HashMap<>();
                bassinMap.put("idBassin", bassin.getIdBassin());
                bassinMap.put("nomBassin", bassin.getNomBassin());
                bassinMap.put("description", bassin.getDescription());
                bassinMap.put("prix", bassin.getPrix());
                bassinMap.put("materiau", bassin.getMateriau());
                bassinMap.put("couleur", bassin.getCouleur());
                bassinMap.put("dimensions", bassin.getDimensions());
                bassinMap.put("disponible", bassin.isDisponible());
                bassinMap.put("stock", bassin.getStock());
                bassinMap.put("archive", bassin.isArchive());
                bassinMap.put("categorie", bassin.getCategorie());
                bassinMap.put("imagesBassin", bassin.getImagesBassin());
                bassinMap.put("imagePath", bassin.getImagePath());
                
                if (Boolean.TRUE.equals(includePromotions)) {
                    Date now = new Date();
                    List<Promotion> activePromotions = promotionService.getAllPromotions().stream()
                        .filter(p -> p.getDateDebut().before(now) && p.getDateFin().after(now))
                        .filter(p -> (p.getBassins() != null && p.getBassins().stream()
                                    .anyMatch(b -> b.getIdBassin().equals(bassin.getIdBassin()))) ||
                                    (p.getCategories() != null && p.getCategories().stream()
                                    .anyMatch(c -> c.getIdCategorie().equals(bassin.getCategorie().getIdCategorie()))))
                        .collect(Collectors.toList());
                    
                    bassinMap.put("promotionActive", !activePromotions.isEmpty());
                    if (!activePromotions.isEmpty()) {
                        Promotion bestPromotion = activePromotions.stream()
                            .max(Comparator.comparing(Promotion::getTauxReduction))
                            .orElse(null);
                        bassinMap.put("activePromotion", bestPromotion);
                    }
                }
                
                result.add(bassinMap);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/active-for-bassin/{bassinId}")
    public ResponseEntity<Promotion> getActivePromotionForBassin(@PathVariable Long bassinId) {
        try {
            Promotion activePromotion = promotionService.getActivePromotionForBassin(bassinId);
            if (activePromotion != null) {
                return ResponseEntity.ok(activePromotion);
            }
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/overlapping-for-bassin/{bassinId}")
    public ResponseEntity<List<Promotion>> getOverlappingPromotionsForBassin(
            @PathVariable Long bassinId,
            @RequestParam String dateDebut,
            @RequestParam String dateFin) {
        try {
            SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd");
            Date startDate = format.parse(dateDebut);
            Date endDate = format.parse(dateFin);
            
            List<Promotion> overlaps = promotionService.getOverlappingPromotionsForBassin(
                bassinId, startDate, endDate);
            return ResponseEntity.ok(overlaps);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/overlapping-for-categorie/{categorieId}")
    public ResponseEntity<List<Promotion>> getOverlappingPromotionsForCategorie(
            @PathVariable Long categorieId,
            @RequestParam String dateDebut,
            @RequestParam String dateFin) {
        try {
            SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd");
            Date startDate = format.parse(dateDebut);
            Date endDate = format.parse(dateFin);
            
            List<Promotion> overlaps = promotionService.getOverlappingPromotionsForCategorie(
                categorieId, startDate, endDate);
            return ResponseEntity.ok(overlaps);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    

}