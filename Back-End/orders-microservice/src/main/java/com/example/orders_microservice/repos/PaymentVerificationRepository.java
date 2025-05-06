package com.example.orders_microservice.repos;

import com.example.orders_microservice.entities.PaymentVerification;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentVerificationRepository extends JpaRepository<PaymentVerification, Long> {
    Optional<PaymentVerification> findByTransactionId(String transactionId);
}