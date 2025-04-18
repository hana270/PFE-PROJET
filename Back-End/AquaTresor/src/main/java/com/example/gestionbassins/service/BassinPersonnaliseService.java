package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.AccessoireDTO;
import com.example.gestionbassins.entities.Accessoire;
import com.example.gestionbassins.entities.BassinPersonnalise;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

public interface BassinPersonnaliseService {

    BassinPersonnalise ajouterBassinPersonnalise(
            Long idBassin,
            List<String> materiaux,
            List<String> dimensions,
            List<Accessoire> accessoires,
            List<MultipartFile> accessoireImages,
            Integer dureeFabrication
    ) throws IOException;

    BassinPersonnalise save(BassinPersonnalise bassinPersonnalise);

    List<BassinPersonnalise> listeBassinsPersonnalises();

    BassinPersonnalise trouverBassinPersonnaliseParIdBassin(Long idBassin);

    void uploadImageAccessoireForAdd(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException;

    void supprimerBassinPersonnalise(Long idBassinPersonnalise);

    List<Accessoire> convertirAccessoireDTOEnAccessoire(List<AccessoireDTO> accessoireDTOs);

    BassinPersonnalise mettreAJourBassinPersonnalise(
            Long idBassinPersonnalise,
            Long idBassin,
            List<String> materiaux,
            List<String> dimensions,
            List<Accessoire> accessoires,
            List<MultipartFile> accessoireImages,
            Integer dureeFabrication
    ) throws IOException;

    void uploadImageAccessoireForUpdate(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException;

    List<Accessoire> getAccessoiresByBassinPersonnaliseId(Long idBassinPersonnalise);

    Map<String, Object> getOptionsForBassin(Long idBassin);
}