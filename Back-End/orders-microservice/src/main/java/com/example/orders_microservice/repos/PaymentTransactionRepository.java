package com.example.orders_microservice.repos;

import com.example.orders_microservice.entities.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {
	  Optional<PaymentTransaction> findByTransactionId(String transactionId);  

}