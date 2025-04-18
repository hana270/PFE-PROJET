package com.example.gestionbassins.repos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.data.rest.webmvc.RepositoryRestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import com.example.gestionbassins.entities.Categorie;

import java.util.List;

@RepositoryRestResource(path="categorie")
@CrossOrigin(origins="http://localhost:4200/") //pour autoriser angular
public interface CategorieRepository extends JpaRepository<Categorie, Long> {


	
}
