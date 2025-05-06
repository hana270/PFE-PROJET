package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.*;
import java.util.List;

public interface PaymentService {
    
    /**
     * Récupère la liste des méthodes de paiement disponibles
     */
    List<PaymentMethodDTO> getAvailablePaymentMethods();
    
    /**
     * Initie un paiement et envoie un code de vérification
     */
    PaymentResponseDTO initiatePayment(PaymentRequestDTO requestDTO);
    
    /**
     * Vérifie le code de vérification et finalise le paiement
     */
    PaymentValidationResponseDTO verifyCode(CodeVerificationRequestDTO request);
    
    /**
     * Renvoie un nouveau code de vérification pour une transaction
     */
    boolean resendVerificationCode(String transactionId);
}