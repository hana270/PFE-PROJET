package com.example.gestionbassins.repos;

import com.example.gestionbassins.entities.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    // Méthode pour récupérer toutes les transactions
    List<Transaction> findAll();
}