package com.example.orders_microservice.entities;

import com.example.orders_microservice.dto.PaymentRequestDTO;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_verifications")
@Data
public class PaymentVerification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String transactionId;
    
    @Column(nullable = false)
    private String verificationCode;
    
    @Column(nullable = false)
    private String email;
    
    @Column(nullable = false)
    private LocalDateTime expiryDate;
    
    @Column(nullable = false)
    private boolean verified = false;
    
    @Column(nullable = false)
    private int attempts = 0;
    
    @Column
    private LocalDateTime verificationDate;
    
    @Column
    private Integer resendCount = 0;
    

    // Store the complete payment request for order creation
    @Transient
    private PaymentRequestDTO paymentRequestDTO;

    // Stocker les informations de paiement pour créer une commande après vérification
    
    @OneToOne
    @JoinColumn(name = "payment_transaction_id")
    private PaymentTransaction paymentTransaction;
    

    public PaymentRequestDTO getPaymentRequestDTO() {
        return paymentRequestDTO;
    }
    
    public void setPaymentRequestDTO(PaymentRequestDTO paymentRequestDTO) {
        this.paymentRequestDTO = paymentRequestDTO;
    }
    
}