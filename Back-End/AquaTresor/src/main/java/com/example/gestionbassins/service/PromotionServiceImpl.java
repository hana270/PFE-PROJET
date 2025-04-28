package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.PromotionDTO;
import com.example.gestionbassins.dto.UpdatePromotionDTO;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.Categorie;
import com.example.gestionbassins.entities.Promotion;
import com.example.gestionbassins.repos.PromotionRepository;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PromotionServiceImpl implements PromotionService {
    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private BassinService bassinService;

    @Autowired
    private CategorieService categorieService;

    @Override
    @Transactional
    public Promotion createPromotion(PromotionDTO promotionDTO) {
        Promotion promotion = new Promotion();
        promotion.setNomPromotion(promotionDTO.getNomPromotion());
        promotion.setTauxReduction(promotionDTO.getTauxReduction());
        promotion.setDateDebut(promotionDTO.getDateDebut());
        promotion.setDateFin(promotionDTO.getDateFin());

        // Convertir les IDs des bassins en objets Bassin
        List<Bassin> bassins = promotionDTO.getBassins().stream()
                .map(bassinService::getBassinById)
                .collect(Collectors.toList());
        promotion.setBassins(bassins);

        // Convertir les IDs des catégories en objets Categorie
        List<Categorie> categories = promotionDTO.getCategories().stream()
                .map(categorieService::getCategorieById)
                .collect(Collectors.toList());
        promotion.setCategories(categories);

        validatePromotion(promotion);
        checkOverlappingPromotions(promotion, null);
        return promotionRepository.save(promotion);
    }

    private void validatePromotion(Promotion promotion) {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        Validator validator = factory.getValidator();
        Set<ConstraintViolation<Promotion>> violations = validator.validate(promotion);

        if (!violations.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (ConstraintViolation<Promotion> violation : violations) {
                sb.append(violation.getMessage()).append("\n");
            }
            throw new IllegalArgumentException("Erreur de validation : " + sb.toString());
        }

        if (!promotion.isBassinOrCategorieSelected()) {
            throw new IllegalArgumentException("Au moins un bassin ou une catégorie doit être sélectionné");
        }
    }

    @Override
    @Transactional
    public Promotion applyPromotionToBassins(Long idPromotion, List<Long> bassinIds) {
        Promotion promotion = promotionRepository.findById(idPromotion)
                .orElseThrow(() -> new RuntimeException("Promotion non trouvée"));

        List<Bassin> bassins = bassinService.getAllBassins().stream()
                .filter(bassin -> bassinIds.contains(bassin.getIdBassin()))
                .collect(Collectors.toList());

        if (bassins.isEmpty()) {
            throw new IllegalArgumentException("Aucun bassin valide trouvé");
        }

        promotion.setBassins(bassins);
        return promotionRepository.save(promotion);
    }

    @Override
    @Transactional
    public Promotion applyPromotionToCategorie(Long idPromotion, Long idCategorie) {
        Promotion promotion = promotionRepository.findById(idPromotion)
                .orElseThrow(() -> new RuntimeException("Promotion non trouvée"));

        Categorie categorie = categorieService.getCategorieById(idCategorie);
        if (categorie == null) {
            throw new RuntimeException("Catégorie non trouvée");
        }

        List<Categorie> categories = promotion.getCategories();
        if (categories == null) {
            categories = new ArrayList<>();
        }
        categories.add(categorie);
        promotion.setCategories(categories);

        List<Bassin> bassins = bassinService.findByCategorie(categorie);
        if (promotion.getBassins() == null) {
            promotion.setBassins(bassins);
        } else {
            promotion.getBassins().addAll(bassins);
        }

        return promotionRepository.save(promotion);
    }

    @Override
    public List<Promotion> getAllPromotions() {
        return promotionRepository.findAll();
    }

    @Override
    public Promotion getPromotionById(Long id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Promotion non trouvée"));
    }

    @Override
    @Transactional
    public void deletePromotion(Long id) {
        promotionRepository.deleteById(id);
    }

    @Override
    @Transactional
    public Promotion updatePromotion(Long id, UpdatePromotionDTO promotionDTO) {
        Promotion existingPromotion = getPromotionById(id);

        existingPromotion.setNomPromotion(promotionDTO.getNomPromotion());
        existingPromotion.setTauxReduction(promotionDTO.getTauxReduction());
        existingPromotion.setDateDebut(promotionDTO.getDateDebut());
        existingPromotion.setDateFin(promotionDTO.getDateFin());

        List<Bassin> bassins = promotionDTO.getBassins().stream()
                .map(bassinService::getBassinById)
                .collect(Collectors.toList());
        existingPromotion.setBassins(bassins);

        List<Categorie> categories = promotionDTO.getCategories().stream()
                .map(categorieService::getCategorieById)
                .collect(Collectors.toList());
        existingPromotion.setCategories(categories);

        validatePromotion(existingPromotion);
        checkOverlappingPromotions(existingPromotion, id);
        return promotionRepository.save(existingPromotion);
    }

    private void checkOverlappingPromotions(Promotion promotion, Long promotionId) {
        List<String> overlappingBassins = new ArrayList<>();
        List<String> overlappingCategories = new ArrayList<>();

        if (promotion.getBassins() != null && !promotion.getBassins().isEmpty()) {
            for (Bassin bassin : promotion.getBassins()) {
                List<Promotion> overlappingPromotions = promotionRepository.findOverlappingPromotionsForBassin(
                        bassin.getIdBassin(), promotion.getDateDebut(), promotion.getDateFin(), promotionId);

                if (!overlappingPromotions.isEmpty()) {
                    overlappingBassins.add(bassin.getNomBassin());
                }
            }
        }

        if (promotion.getCategories() != null && !promotion.getCategories().isEmpty()) {
            for (Categorie categorie : promotion.getCategories()) {
                List<Promotion> overlappingPromotions = promotionRepository.findOverlappingPromotionsForCategorie(
                        categorie.getIdCategorie(), promotion.getDateDebut(), promotion.getDateFin(), promotionId);

                if (!overlappingPromotions.isEmpty()) {
                    overlappingCategories.add(categorie.getNomCategorie());
                }
            }
        }

        if (!overlappingBassins.isEmpty() || !overlappingCategories.isEmpty()) {
            StringBuilder errorMessage = new StringBuilder("Chevauchement de promotions détecté:\n");

            if (!overlappingBassins.isEmpty()) {
                errorMessage.append("Bassins déjà en promotion pendant cette période: ")
                        .append(String.join(", ", overlappingBassins)).append("\n");
            }

            if (!overlappingCategories.isEmpty()) {
                errorMessage.append("Catégories déjà en promotion pendant cette période: ")
                        .append(String.join(", ", overlappingCategories));
            }

            throw new IllegalArgumentException(errorMessage.toString());
        }
    }

 
    
    
    @Override
    public Promotion getActivePromotionForBassin(Long bassinId) {
        Date now = new Date();
        return promotionRepository.findActivePromotionForBassin(bassinId, now);
    }

    @Override
    public List<Promotion> getOverlappingPromotionsForBassin(Long bassinId, Date dateDebut, Date dateFin) {
        return promotionRepository.findOverlappingPromotionsForBassin(bassinId, dateDebut, dateFin);
    }

    @Override
    public List<Promotion> getOverlappingPromotionsForCategorie(Long categorieId, Date dateDebut, Date dateFin) {
        return promotionRepository.findOverlappingPromotionsForCategorie(categorieId, dateDebut, dateFin);
    }
    
    public List<Promotion> getActivePromotionsForBassin(Long bassinId) {
        Date now = new Date();
        return promotionRepository.findActivePromotionsForBassin(bassinId, now);
    }
}