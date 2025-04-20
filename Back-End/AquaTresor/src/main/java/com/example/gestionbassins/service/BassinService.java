package com.example.gestionbassins.service;

import java.util.Date;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.gestionbassins.dto.BassinDTO;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.Categorie;
import com.example.gestionbassins.entities.Transaction;

public interface BassinService {
    Bassin saveBassin(Bassin b);
    Bassin updateBassin(Bassin b);
    Bassin updateBassin(Long id, Bassin b);
    void deleteBassin(Bassin b);
    void deleteBassinById(Long id);
    Bassin getBassin(Long id);
    Bassin getBassinById(Long id);
    List<Bassin> getAllBassins();
    
    // Recherche
    List<Bassin> findByNomBassin(String nom);
    List<Bassin> findByNomBassinContains(String nom);
    List<Bassin> findByCategorie(Categorie c);
    List<Bassin> findByCategorieIdCategorie(Long id);
    List<Bassin> findByOrderByNomBassinAsc();
    List<Bassin> trierBassinsNomsPrix();
    
    // Gestion archivage et stock
    Bassin archiverBassin(Long id);
    Bassin desarchiverBassin(Long id, int nouvelleQuantite);
    Bassin mettreAJourQuantite(Long id, int quantite, String raison);
    List<Bassin> getBassinsNonArchives();
    List<Bassin> getBassinsArchives();
    void notifierStockFaible();
    
    // Gestion des transactions
    List<Transaction> getTransactions();
    void adjustStock(Long bassinId, int quantityDelta);
    Bassin adjustStock(Long bassinId, int quantityDelta, String raison, String typeOperation, String username);
    List<Transaction> getBassinTransactions(Long bassinId);
    
    // Génération de rapports
    byte[] generateStockReport(Long categorieId, boolean showArchived);
    byte[] generateBassinStockReport(Long bassinId, Date startDate, Date endDate);
    byte[] generateGlobalStockReport(Date startDate, Date endDate);
    
    // DTO
    BassinDTO toBassinDTO(Bassin bassin);
    public Bassin mettreSurCommande(Long id);
    public Bassin mettreSurCommande(Long id, Integer dureeFabricationJours);
    
    public Bassin updateDureeFabrication(Long id, int dureeMin, int dureeMax) ;


    public Bassin updateDureeFabrication(Long id, Integer duree); // For single value
    public Bassin updateDureeFabrication(Long id, Integer dureeMin, Integer dureeMax); // For range


}