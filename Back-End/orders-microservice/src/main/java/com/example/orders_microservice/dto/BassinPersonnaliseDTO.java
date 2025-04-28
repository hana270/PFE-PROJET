package com.example.orders_microservice.dto;

import java.util.List;

import lombok.Data;

@Data
public class BassinPersonnaliseDTO {
    private Long idBassinPersonnalise;
    private Long idBassin;
    
    private String nomBassin;
    
    private List<String> materiaux;
    private List<String> dimensions;
    private List<AccessoireDTO> accessoires;
    private Integer dureeFabrication;
    private Double prixEstime;

    private double prixTotal;
    private String imagePath;
    // Getters and setters
    public Long getIdBassinPersonnalise() {
        return idBassinPersonnalise;
    }

    public void setIdBassinPersonnalise(Long idBassinPersonnalise) {
        this.idBassinPersonnalise = idBassinPersonnalise;
    }

    public Long getIdBassin() {
        return idBassin;
    }

    public void setIdBassin(Long idBassin) {
        this.idBassin = idBassin;
    }

    public List<String> getMateriaux() {
        return materiaux;
    }

    public void setMateriaux(List<String> materiaux) {
        this.materiaux = materiaux;
    }

    public List<String> getDimensions() {
        return dimensions;
    }

    public void setDimensions(List<String> dimensions) {
        this.dimensions = dimensions;
    }

    public List<AccessoireDTO> getAccessoires() {
        return accessoires;
    }

    public void setAccessoires(List<AccessoireDTO> accessoires) {
        this.accessoires = accessoires;
    }

    public Integer getDureeFabrication() {
        return dureeFabrication;
    }

    public void setDureeFabrication(Integer dureeFabrication) {
        this.dureeFabrication = dureeFabrication;
    }

    public Double getPrixEstime() {
        return prixEstime;
    }

    public void setPrixEstime(Double prixEstime) {
        this.prixEstime = prixEstime;
    }




}