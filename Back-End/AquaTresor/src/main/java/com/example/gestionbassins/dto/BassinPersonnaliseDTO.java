package com.example.gestionbassins.dto;

import com.example.gestionbassins.entities.Accessoire;
import com.example.gestionbassins.entities.Bassin;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public class BassinPersonnaliseDTO {
    private Long idBassinPersonnalise; // Ajoutez ce champ
    private Long idBassin;
    private Bassin bassin; // Ajout du champ
    private List<String> materiaux;
    private List<String> dimensions;
    private List<AccessoireDTO> accessoires;
    private List<MultipartFile> accessoireImages;
    private Integer dureeFabrication; // en jours

    // Getters et Setters
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
    
 // Getters et Setters
    public Bassin getBassin() {
        return bassin;
    }

    public void setBassin(Bassin bassin) {
        this.bassin = bassin;
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

    public List<MultipartFile> getAccessoireImages() {
        return accessoireImages;
    }

    public void setAccessoireImages(List<MultipartFile> accessoireImages) {
        this.accessoireImages = accessoireImages;
    }
    
    public Integer getDureeFabrication() {
		return dureeFabrication;
	}

	public void setDureeFabrication(Integer dureeFabrication) {
		this.dureeFabrication = dureeFabrication;
	}
}