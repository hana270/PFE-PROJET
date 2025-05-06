package com.example.orders_microservice.restcontrollers;

import com.example.orders_microservice.dto.*;
import com.example.orders_microservice.service.CommandeService;
import com.example.orders_microservice.service.PaymentService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;
    private final CommandeService commandeService;

    @Autowired
    public PaymentController(PaymentService paymentService, CommandeService commandeService) {
        this.paymentService = paymentService;
        this.commandeService = commandeService;
    }

    /**
     * Initie un processus de paiement
     */
    @PostMapping("/initiate")
    public ResponseEntity<?> initiatePayment(@RequestBody PaymentRequestDTO requestDTO) {
        try {
            logger.info("Received payment initiation request for: {}", 
                    requestDTO.getCommandeId() != null ? requestDTO.getCommandeId() : "cart items");
            
            PaymentResponseDTO response = paymentService.initiatePayment(requestDTO);
            
            // Retourner toujours le transactionId même en cas d'échec d'envoi d'email
            return ResponseEntity.ok(response);
            
        } catch (Exception ex) {
            logger.error("Payment initiation failed", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("PAYMENT_ERROR", ex.getMessage()));
        }
    }
    /**
     * Vérifie un code de vérification envoyé par email
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyCode(@RequestBody CodeVerificationRequestDTO requestDTO) {
        try {
            PaymentValidationResponseDTO response = paymentService.verifyCode(requestDTO);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            logger.error("Code verification failed: Invalid input", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("INVALID_CODE", ex.getMessage()));
        } catch (IllegalStateException ex) {
            logger.error("Code verification failed: Invalid state", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("INVALID_STATE", ex.getMessage()));
        } catch (Exception ex) {
            logger.error("Code verification failed", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("VERIFICATION_ERROR", ex.getMessage()));
        }
    }

    /**
     * Renvoie un code de vérification
     */
    @PostMapping("/resend-code")
    public ResponseEntity<?> resendVerificationCode(@RequestBody ResendCodeRequestDTO requestDTO) {
        try {
            boolean success = paymentService.resendVerificationCode(requestDTO.getTransactionId());
            if (success) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Code de vérification renvoyé avec succès"));
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new ErrorResponse("EMAIL_SEND_ERROR", 
                              "Impossible d'envoyer l'email de vérification. Veuillez réessayer."));
            }
        } catch (IllegalStateException ex) {
            logger.error("Resend code failed: Invalid state", ex);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("INVALID_STATE", ex.getMessage()));
        } catch (Exception ex) {
            logger.error("Resend code failed", ex);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("RESEND_ERROR", ex.getMessage()));
        }
    }

    /**
     * Liste les méthodes de paiement disponibles
     */
    @GetMapping("/methods")
    public ResponseEntity<List<PaymentMethodDTO>> getPaymentMethods() {
        List<PaymentMethodDTO> methods = paymentService.getAvailablePaymentMethods();
        return ResponseEntity.ok(methods);
    }
    
    // Add a Map import at the top of the file
    private static class Map {
        public static java.util.Map<String, Object> of(String key1, Object value1, String key2, Object value2) {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put(key1, value1);
            map.put(key2, value2);
            return map;
        }
    }
}

class ResendCodeRequestDTO {
    private String transactionId;

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }
}