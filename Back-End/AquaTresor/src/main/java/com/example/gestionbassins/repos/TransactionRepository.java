package com.example.gestionbassins.repos;

import com.example.gestionbassins.entities.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    // Use consistent naming - choose one of these approaches:
    
    // Option 1: Using the relationship property name
    List<Transaction> findByBassin_IdBassinOrderByDateTransactionDesc(Long bassinId);
    
    // Option 2: Or if you prefer the other style, make sure it matches your entity
    // List<Transaction> findByBassinIdOrderByDateTransactionDesc(Long bassinId);
    
    List<Transaction> findByDateTransactionBetweenOrderByDateTransactionDesc(Date startDate, Date endDate);
    
    List<Transaction> findByBassin_IdBassinAndDateTransactionBetweenOrderByDateTransactionDesc(
        Long bassinId, Date startDate, Date endDate);
}