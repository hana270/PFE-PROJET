package com.example.gestionbassins.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.gestionbassins.entities.Categorie;
import com.example.gestionbassins.repos.CategorieRepository;



@Service
public class CategorieServiceImpl implements CategorieService { // Change to class

    @Autowired
    CategorieRepository categorieRepository;

    @Override
    public Categorie saveCategorie(Categorie c) {
        return categorieRepository.save(c);
    }

    @Override
    public Categorie updateCategorie(Categorie c) {
        if (!categorieRepository.existsById(c.getIdCategorie())) {
            throw new RuntimeException("Categorie introuvable !");
        }
        return categorieRepository.save(c);
    }
    
    @Override
    public Categorie getCategorieById(Long id) {
        return categorieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categorie introuvable !"));
    }

    @Override
    public void deleteCategorie(Categorie c) {
    	categorieRepository.delete(c);
    }

    @Override
    public void deleteCategorieById(Long id) {
        if (!categorieRepository.existsById(id)) {
            throw new RuntimeException("Category not found with id: " + id); // Throw custom exception
        }
        categorieRepository.deleteById(id);
    }

    @Override
    public Categorie getBassin(Long id) { // Changed method name to match entity
        return categorieRepository.findById(id).orElseThrow(() -> new RuntimeException("Categorie not found")); // Optional handling
    }

    @Override
    public List<Categorie> getAllCategories() {
        return categorieRepository.findAll();
    }
}

