package com.example.gestionbassins.service;

import java.util.List;

import com.example.gestionbassins.entities.Categorie;

public interface CategorieService {
	Categorie saveCategorie(Categorie c);
	Categorie updateCategorie(Categorie c);
	void deleteCategorie(Categorie c);
	void deleteCategorieById(Long id);
	Categorie getBassin(Long id);
	List<Categorie> getAllCategories();
	
	Categorie getCategorieById(Long id);

}
