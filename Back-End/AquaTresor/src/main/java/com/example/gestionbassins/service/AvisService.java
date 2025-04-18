package com.example.gestionbassins.service;

import com.example.gestionbassins.entities.Avis;
import java.util.List;

public interface AvisService {
    Avis addAvis(Avis avis, Long idBassin, String username, boolean isAuthenticated);
    List<Avis> getAvisByBassinId(Long idBassin);
    void deleteAvis(Long idAvis, String username);
    Avis updateAvis(Long idAvis, Avis updatedAvis, String username);
    List<Avis> getAllAvis();
}