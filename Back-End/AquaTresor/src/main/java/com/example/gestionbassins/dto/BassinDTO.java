// bassins-microservice/src/main/java/com/example/gestionbassins/dto/BassinDTO.java
package com.example.gestionbassins.dto;

import lombok.Data;
import java.util.List;

@Data
public class BassinDTO {
    private Long idBassin;
    private String nomBassin;
    private String description;
    private Double prix;
    private String materiau;
    private String couleur;
    private String dimensions;
    private boolean disponible;
    private int stock;
    private Long promotionId; // Ajouté
    private String imagePath;
    private List<String> imagesBassin;
    private boolean promotionActive;
    private Double prixPromo;
    private boolean archive;
    private Long categorieId;
}