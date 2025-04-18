package com.example.gestionbassins.service;

import java.util.List;

import com.example.gestionbassins.dto.BassinDTO;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.Categorie;
import com.example.gestionbassins.entities.ImageBassin;
import com.example.gestionbassins.entities.Transaction;

public interface BassinService {
	// ev ->b //th -> c
	Bassin saveBassin(Bassin b);

	Bassin updateBassin(Bassin b);

	void deleteBassin(Bassin b);

	// à vérifier cette fonction aprés
	void deleteBassinById(Long id);

	Bassin getBassin(Long id);

	List<Bassin> getAllBassins();

	List<Bassin> findByNomBassin(String nom);

	List<Bassin> findByNomBassinContains(String nom);

	List<Bassin> findByNomPrix(String nom, Double prix);

	List<Bassin> findByCategorie(Categorie c);

	List<Bassin> findByCategorieIdCategorie(Long id);

	List<Bassin> findByOrderByNomBassinAsc();

	List<Bassin> trierBassinsNomsPrix();

	Bassin getBassinById(Long id);

	Bassin updateBassin(Long id, Bassin bassin);

	Bassin archiverBassin(Long id);

	Bassin desarchiverBassin(Long id, int nouvelleQuantite);

	Bassin mettreAJourQuantite(Long id, int quantite, String raison);

	List<Bassin> getBassinsNonArchives();

	List<Bassin> getBassinsArchives();

	List<Transaction> getTransactions();

	void notifierStockFaible();

	public byte[] generateStockReport();
}
