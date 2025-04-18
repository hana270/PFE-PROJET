package com.example.gestionbassins.restcontrollers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.example.gestionbassins.entities.Categorie;
import com.example.gestionbassins.repos.CategorieRepository;
import com.example.gestionbassins.service.CategorieService;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "http://localhost:4200", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
public class CategorieRESTController {

	@Autowired
	CategorieRepository categorieRepository; 
    
	@Autowired
    CategorieService categorieService;
	
    // Get all themes
    @RequestMapping(method = RequestMethod.GET)
    public List<Categorie> getAllCategories() {
        return categorieRepository.findAll();
    }
    
    // Get a theme by ID
    @RequestMapping(value = "/{id}", method = RequestMethod.GET)
    public Categorie getCategorieById(@PathVariable("id") Long id) {
        return categorieRepository.findById(id).orElse(null); // Use orElse(null) to handle cases when the theme is not found
    }
    
 // Create a new category
    @PostMapping("/addCategorie")
    public ResponseEntity<?> createCategorie(@RequestBody Categorie categorie) {
        if (categorie.getNomCategorie() == null || categorie.getNomCategorie().isEmpty()) {
            return ResponseEntity.badRequest().body("Le nom de la catégorie est obligatoire.");
        }
        Categorie savedCategorie = categorieRepository.save(categorie);
        return ResponseEntity.ok(savedCategorie);
    }
    
    // Update an existing category
    @RequestMapping(value = "/updateCategorie/{id}", method = RequestMethod.PUT)
    public ResponseEntity<?> updateCategorie(@PathVariable("id") Long id, @RequestBody Categorie categorie) {
        // Vérifier si la catégorie existe
        Categorie existingCategorie = categorieService.getCategorieById(id);
        if (existingCategorie == null) {
            return ResponseEntity.badRequest().body("Catégorie introuvable !");
        }

        // Mettre à jour les champs
        existingCategorie.setNomCategorie(categorie.getNomCategorie());
        existingCategorie.setDescription(categorie.getDescription());

        try {
            Categorie updatedCategorie = categorieService.updateCategorie(existingCategorie);
            return ResponseEntity.ok(updatedCategorie);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body("Erreur lors de la mise à jour : " + e.getMessage());
        }
    }
    
    //delete une category
    @DeleteMapping("/deleteCategorie/{id}")
    public ResponseEntity<?> deleteCategorie(@PathVariable("id") Long id) {
        try {
            categorieService.deleteCategorieById(id);
            return ResponseEntity.ok().build(); // Return 200 OK with no body for successful deletion
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage()); // Return 400 with error message
        } catch (Exception e) { // Catch other exceptions for more robust error handling
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred during deletion."); // 500
        }
    }



}
