package com.example.gestionbassins.dto;

import java.util.List;
import com.example.gestionbassins.entities.Bassin;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Entity;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;


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
   private String imagePath;
    private List<String> imagesBassin;
    private boolean promotionActive;
    private Double prixPromo;
    
    
}