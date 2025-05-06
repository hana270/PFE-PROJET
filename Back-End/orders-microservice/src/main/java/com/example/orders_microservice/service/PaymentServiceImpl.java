package com.example.orders_microservice.service;

import com.example.orders_microservice.dto.*;
import com.example.orders_microservice.entities.*;
import com.example.orders_microservice.repos.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import java.util.HashMap;
import java.util.Map;

@Service
public class PaymentServiceImpl implements PaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentServiceImpl.class);

    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final PaymentVerificationRepository paymentVerificationRepository;
    private final CommandeService commandeService;
    private final EmailService emailService;

    @Value("${payment.card.verification-code-length:6}")
    private int verificationCodeLength;

    @Value("${payment.card.verification-code-expiry-minutes:10}")
    private int verificationCodeExpiryMinutes;

    @Value("${application.name:E-Commerce}")
    private String applicationName;

    @Autowired
    public PaymentServiceImpl(
            PaymentTransactionRepository paymentTransactionRepository,
            PaymentMethodRepository paymentMethodRepository,
            PaymentVerificationRepository paymentVerificationRepository,
            CommandeService commandeService,
            EmailService emailService) {
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.paymentVerificationRepository = paymentVerificationRepository;
        this.commandeService = commandeService;
        this.emailService = emailService;
    }

    @Override
    public PaymentResponseDTO initiatePayment(PaymentRequestDTO requestDTO) {
        logger.info("Initiating payment for commandeId: {}", requestDTO.getCommandeId());
        
        // Validation - accept either commandeId or cartItems
        if ((requestDTO.getCommandeId() == null || requestDTO.getCommandeId().isEmpty()) 
                && (requestDTO.getCartItems() == null || requestDTO.getCartItems().isEmpty())) {
            throw new IllegalArgumentException("Either commandeId or cartItems must be provided");
        }
        
        // Validation des données de paiement
        validatePaymentRequest(requestDTO);

        // Création de la transaction
        PaymentTransaction transaction = createPaymentTransaction(requestDTO);

        // Association de la transaction à la commande ou calcul du montant
        if (requestDTO.getCommandeId() != null && !requestDTO.getCommandeId().isEmpty()) {
            try {
                CommandeDTO commande = commandeService.getCommandeByNumero(requestDTO.getCommandeId());
                if (commande != null) {
                    transaction.setCommandeId(commande.getId());
                    transaction.setMontant(commande.getMontantTotalTTC());
                } else {
                    logger.warn("Commande avec le numéro {} non trouvée.", requestDTO.getCommandeId());
                    throw new RuntimeException("Commande non trouvée avec le numéro: " + requestDTO.getCommandeId());
                }
            } catch (Exception e) {
                // Si la commande n'existe pas mais que nous avons des items de panier, continuons avec les items
                if (requestDTO.getCartItems() != null && !requestDTO.getCartItems().isEmpty()) {
                    logger.warn("Commande {} non trouvée, mais cartItems fournis. Traitement basé sur les articles.", requestDTO.getCommandeId());
                    // Ne définissez pas commandeId pour la transaction
                    transaction.setCommandeId(null);
                    processCartItems(transaction, requestDTO.getCartItems());
                } else {
                    // Sinon relancer l'exception
                    throw e;
                }
            }
        } else if (requestDTO.getCartItems() != null && !requestDTO.getCartItems().isEmpty()) {
            // Traitement des items du panier
            processCartItems(transaction, requestDTO.getCartItems());
        } else {
            logger.warn("Aucune information de commande ou d'articles fournie pour la transaction.");
            throw new RuntimeException("Aucune information de commande ou d'articles fournie.");
        }

        try {
            paymentTransactionRepository.save(transaction);
        } catch (Exception e) {
            logger.error("Erreur inattendue lors de la sauvegarde de la transaction: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur inattendue lors du traitement du paiement.", e);
        }

        // Génération et envoi du code de vérification
        String verificationCode = generateVerificationCode();
        saveVerificationCode(transaction, verificationCode, requestDTO);
        
        PaymentResponseDTO response = createPaymentResponse(transaction);
        
        // Tentative d'envoi du code par email - ne pas bloquer le processus en cas d'échec
        boolean emailSent = false;
        try {
            // Send verification email using EmailService
            sendVerificationEmail(requestDTO.getEmail(), verificationCode, transaction.getCardMasked(),
                    transaction.getMontant(), requestDTO.getCommandeId());
            emailSent = true;
        } catch (MailAuthenticationException ex) {
            logger.error("SMTP Authentication failed for email: {}", requestDTO.getEmail(), ex);
            response.setMessage("Transaction créée, mais l'envoi du code de vérification a échoué (Erreur d'authentification SMTP). " +
                               "Utilisez l'option 'Renvoyer le code' pour réessayer.");
        } catch (MailSendException ex) {
            logger.error("Failed to send email to {}: {}", requestDTO.getEmail(), ex.getMessage(), ex);
            response.setMessage("Transaction créée, mais l'envoi du code de vérification a échoué (Erreur d'envoi d'email). " +
                               "Utilisez l'option 'Renvoyer le code' pour réessayer.");
        } catch (Exception ex) {
            logger.error("Unexpected error while sending email to {}", requestDTO.getEmail(), ex);
            response.setMessage("Transaction créée, mais l'envoi du code de vérification a échoué. " +
                               "Utilisez l'option 'Renvoyer le code' pour réessayer.");
        }
        
        // Si l'email a été envoyé avec succès
        if (emailSent) {
            response.setMessage("Transaction créée avec succès. Veuillez vérifier votre email pour le code de vérification.");
        }
        
        return response;
    }

    // Nouvelle méthode pour traiter les items du panier
    private void processCartItems(PaymentTransaction transaction, List<PanierItemDTO> cartItems) {
        // Vérification des détails des bassins
        validateBassinDetails(cartItems);

        // Calcul du montant total des items du panier
        double totalAmount = cartItems.stream()
                .mapToDouble(item -> item.getEffectivePrice() * item.getQuantity()).sum();

        // Ajouter la TVA (19%)
        double tva = totalAmount * 0.19;
        transaction.setMontant(totalAmount + tva);
    }

    private void validateBassinDetails(List<PanierItemDTO> items) {
        for (PanierItemDTO item : items) {
            // Validation de l'ID du bassin (obligatoire)
            if (item.getBassinId() == null) {
                throw new IllegalArgumentException("ID du bassin requis pour l'article: " + item.getNomBassin());
            }

            // Validation pour les articles personnalisés
            if (Boolean.TRUE.equals(item.getIsCustomized())) {
                if (item.getDureeFabrication() == null || item.getDureeFabrication().isEmpty()) {
                    logger.warn("Bassin personnalisé sans durée de fabrication (ID: {})", item.getBassinId());
                    // Option: définir une durée par défaut ou continuer avec un avertissement
                    item.setDureeFabrication("15 jours"); // Valeur par défaut
                }
            }

            // Validation pour les articles sur commande
            if ("SUR_COMMANDE".equals(item.getStatus())) {
                if (item.getOrderDetails() == null || item.getOrderDetails().isEmpty()) {
                    logger.warn("Bassin sur commande sans détails (ID: {})", item.getBassinId());
                    // Option 1: Générer des détails par défaut
                    item.setOrderDetails("Détails de commande par défaut pour le bassin " + item.getBassinId());
                }
            }
        }
    }

    private void validatePaymentRequest(PaymentRequestDTO requestDTO) {
        if (requestDTO.getCardNumber() == null || !requestDTO.getCardNumber().matches("\\d{16}")) {
            throw new IllegalArgumentException("Le numéro de carte doit contenir exactement 16 chiffres");
        }

        if (requestDTO.getExpiryMonth() == null || !requestDTO.getExpiryMonth().matches("\\d{2}")) {
            throw new IllegalArgumentException("Le mois d'expiration doit contenir 2 chiffres");
        }

        if (requestDTO.getExpiryYear() == null || !requestDTO.getExpiryYear().matches("\\d{2}")) {
            throw new IllegalArgumentException("L'année d'expiration doit contenir 2 chiffres");
        }

        if (requestDTO.getCvv() == null || !requestDTO.getCvv().matches("\\d{3}")) {
            throw new IllegalArgumentException("Le code de sécurité doit contenir 3 chiffres");
        }

        if (requestDTO.getEmail() == null || !requestDTO.getEmail().matches("^[\\w-.]+@([\\w-]+\\.)+[\\w-]{2,4}$")) {
            throw new IllegalArgumentException("L'adresse email est invalide");
        }

        if (requestDTO.getCardholderName() == null || requestDTO.getCardholderName().trim().isEmpty()) {
            throw new IllegalArgumentException("Le nom du titulaire est requis");
        }
    }

    private PaymentTransaction createPaymentTransaction(PaymentRequestDTO requestDTO) {
        PaymentTransaction transaction = new PaymentTransaction();
        if (requestDTO.getCommandeId() != null && !requestDTO.getCommandeId().isEmpty()) {
            // La récupération de la commande et l'assignation de l'ID se fait dans la
            // méthode initiatePayment.
        }
        if (requestDTO.getMethodeId() != null) {
            transaction.setMethodeId(requestDTO.getMethodeId().longValue());
        } else {
            logger.warn("MethodeId non fourni dans la requête de paiement.");
            throw new IllegalArgumentException("L'ID de la méthode de paiement est requis.");
        }

        transaction.setStatut("EN_ATTENTE");
        transaction.setTransactionId(UUID.randomUUID().toString());
        transaction.setDateCreation(LocalDateTime.now());
        transaction.setCardMasked(maskCardNumber(requestDTO.getCardNumber()));
        transaction.setEmail(requestDTO.getEmail());
        transaction.setCardholderName(requestDTO.getCardholderName());
        return transaction;
    }
    @Override
    public PaymentValidationResponseDTO verifyCode(CodeVerificationRequestDTO request) {
        PaymentVerification verification = paymentVerificationRepository.findByTransactionId(request.getTransactionId())
                .orElseThrow(() -> new RuntimeException("Transaction non trouvée"));

        validateVerification(verification, request.getVerificationCode());

        // Mise à jour de la vérification
        verification.setVerified(true);
        verification.setVerificationDate(LocalDateTime.now());
        paymentVerificationRepository.save(verification);

        // Mise à jour de la transaction
        PaymentTransaction transaction = verification.getPaymentTransaction();
        transaction.setStatut("VALIDEE");
        transaction.setDateValidation(LocalDateTime.now());
        transaction.setReferenceExterne(generateReferenceExterne());
        paymentTransactionRepository.save(transaction);

        String commandeIdOrNumero = null;
        CommandeDTO commande = null;
        
        try {
            // Si la transaction est liée à une commande existante
            if (transaction.getCommandeId() != null) {
                commande = commandeService.getCommandeByNumero(transaction.getCommandeId().toString());
                if (commande != null) {
                    commandeIdOrNumero = commande.getNumeroCommande();
                    // Mettre à jour le statut de la commande
                    commandeService.updateCommandeStatus(commandeIdOrNumero, "VALIDEE");
                }
            }
            
            // Si pas de commande existante mais des items de panier
            if (commande == null && verification.getPaymentRequestDTO() != null 
                    && verification.getPaymentRequestDTO().getCartItems() != null) {
                commande = commandeService.createCommandeFromPayment(verification.getPaymentRequestDTO());
                commandeIdOrNumero = commande.getNumeroCommande();
            }

            // Envoi de la confirmation
            if (commandeIdOrNumero != null) {
                sendPaymentConfirmationEmail(verification.getEmail(), 
                    transaction.getReferenceExterne(),
                    transaction.getMontant(), 
                    commandeIdOrNumero);
            }
        } catch (Exception ex) {
            logger.error("Erreur lors de la mise à jour de la commande", ex);
            // Ne pas bloquer le processus même en cas d'échec
        }

        return createValidationResponse(transaction, commandeIdOrNumero);
    }
    
    private void validateVerification(PaymentVerification verification, String inputCode) {
        if (verification.isVerified()) {
            throw new IllegalStateException("Cette transaction a déjà été vérifiée");
        }

        if (LocalDateTime.now().isAfter(verification.getExpiryDate())) {
            throw new IllegalStateException("Le code de vérification a expiré");
        }

        verification.setAttempts(verification.getAttempts() + 1);

        if (verification.getAttempts() > 3) {
            paymentVerificationRepository.save(verification);
            throw new IllegalStateException("Nombre maximal de tentatives dépassé. Veuillez réinitialiser le code.");
        }

        if (!verification.getVerificationCode().equals(inputCode)) {
            paymentVerificationRepository.save(verification);
            throw new IllegalArgumentException("Code de vérification incorrect");
        }
    }

    private PaymentValidationResponseDTO createValidationResponse(PaymentTransaction transaction, String commandeId) {
        PaymentValidationResponseDTO response = new PaymentValidationResponseDTO();
        response.setSuccess(true);
        response.setMessage("Paiement validé avec succès");
        response.setCommandeId(commandeId);
        response.setReferenceTransaction(transaction.getReferenceExterne());
        return response;
    }

    @Override
    public boolean resendVerificationCode(String transactionId) {
        PaymentVerification verification = paymentVerificationRepository.findByTransactionId(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction non trouvée"));

        if (verification.isVerified()) {
            throw new IllegalStateException("Cette transaction a déjà été vérifiée");
        }

        if (verification.getResendCount() != null && verification.getResendCount() >= 3) {
            throw new IllegalStateException("Nombre maximal de renvois atteint. Veuillez réessayer ultérieurement.");
        }

        // Générer un nouveau code
        String newCode = generateVerificationCode();
        verification.setVerificationCode(newCode);
        verification.setExpiryDate(LocalDateTime.now().plusMinutes(verificationCodeExpiryMinutes));
        verification.setAttempts(0);
        verification.setResendCount(verification.getResendCount() == null ? 1 : verification.getResendCount() + 1);

        paymentVerificationRepository.save(verification);

        try {
            // Renvoyer le code par email
            sendVerificationEmail(verification.getEmail(), newCode, verification.getPaymentTransaction().getCardMasked(),
                    verification.getPaymentTransaction().getMontant(),
                    verification.getPaymentRequestDTO() != null ? verification.getPaymentRequestDTO().getCommandeId()
                            : null);
            return true;
        } catch (Exception ex) {
            logger.error("Failed to resend verification code", ex);
            // Indicate failure so the client can retry
            return false;
        }
    }

    private String generateVerificationCode() {
        return ThreadLocalRandom.current().ints(verificationCodeLength, 0, 10)
                .collect(StringBuilder::new, StringBuilder::append, StringBuilder::append).toString();
    }

    private void saveVerificationCode(PaymentTransaction transaction, String code,
            PaymentRequestDTO paymentRequestDTO) {
        PaymentVerification verification = new PaymentVerification();
        verification.setTransactionId(transaction.getTransactionId());
        verification.setVerificationCode(code);
        verification.setEmail(transaction.getEmail());
        verification.setExpiryDate(LocalDateTime.now().plusMinutes(verificationCodeExpiryMinutes));
        verification.setPaymentTransaction(transaction);
        verification.setAttempts(0);
        verification.setResendCount(0);
        verification.setPaymentRequestDTO(paymentRequestDTO); // Save PaymentRequestDTO
        paymentVerificationRepository.save(verification);
    }

    private void sendVerificationEmail(String email, String code, String cardMasked, Double amount, String orderNumber) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("code", code);
            variables.put("cardMasked", cardMasked);
            variables.put("expiryMinutes", verificationCodeExpiryMinutes);
            variables.put("amount", amount);
            variables.put("orderNumber", orderNumber);
            variables.put("applicationName", applicationName);
            
            logger.info("Sending verification email to {}", email);
            
            emailService.sendEmail(
                email, 
                applicationName + " - Code de vérification pour votre paiement",
                "verification-code",  // Nom du template sans le préfixe "email/"
                variables
            );
            
            logger.info("Verification email sent successfully to {}", email);
        } catch (Exception e) {
            logger.error("Failed to send verification email to {}: {}", email, e.getMessage(), e);
            throw e; // Re-throw to be handled by the caller
        }
    }

    private void sendPaymentConfirmationEmail(String email, String referenceTransaction, Double amount, String orderNumber) {
        try {
            Map<String, Object> variables = new HashMap<>();
            variables.put("referenceTransaction", referenceTransaction);
            variables.put("amount", amount);
            variables.put("orderNumber", orderNumber);
            variables.put("date", LocalDateTime.now());
            variables.put("applicationName", applicationName);
            
            emailService.sendEmail(
                email, 
                applicationName + " - Confirmation de votre paiement",
                "payment-confirmation",  // Nom du template sans le préfixe "email/"
                variables
            );
            
            logger.info("Payment confirmation email sent successfully to {}", email);
        } catch (Exception e) {
            logger.error("Failed to send payment confirmation email to {}: {}", email, e.getMessage(), e);
            throw e; // Re-throw pour être géré par l'appelant
        }
    }
    
    private String maskCardNumber(String cardNumber) {
        if (cardNumber == null || cardNumber.length() < 16) {
            return "****";
        }
        return "****-****-****-" + cardNumber.substring(cardNumber.length() - 4);
    }

    private String generateReferenceExterne() {
        return "PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    @Override
    public List<PaymentMethodDTO> getAvailablePaymentMethods() {
        return paymentMethodRepository.findAllByEnabledTrue().stream()
                .filter(method -> "CARTE".equals(method.getType())).map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private PaymentMethodDTO convertToDto(PaymentMethod method) {
        return new PaymentMethodDTO(method.getId(), method.getNom(), method.getDescription(), method.getImageUrl(),
                method.getType());
    }

    private PaymentResponseDTO createPaymentResponse(PaymentTransaction transaction) {
        PaymentResponseDTO response = new PaymentResponseDTO();
        response.setSuccess(true);
        response.setTransactionId(transaction.getTransactionId());
        response.setCommandeId(transaction.getCommandeId() != null ? transaction.getCommandeId().toString() : null);
        response.setMessage("Transaction créée avec succès");
        return response;
    }
}