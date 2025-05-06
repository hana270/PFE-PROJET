package com.example.orders_microservice.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PaymentRequestDTO {
    private String commandeId;
    private String commandeNumero; // Added this field to match the frontend request
    private Long methodeId;
    private List<PanierItemDTO> cartItems;

    @NotBlank(message = "Le numéro de carte est requis")
    @Pattern(regexp = "\\d{16}", message = "Le numéro de carte doit contenir 16 chiffres")
    private String cardNumber;

    @NotBlank(message = "Le mois d'expiration est requis")
    @Pattern(regexp = "\\d{1,2}", message = "Format du mois d'expiration invalide")
    private String expiryMonth;

    @NotBlank(message = "L'année d'expiration est requise")
    @Pattern(regexp = "\\d{2,4}", message = "Format de l'année d'expiration invalide")
    private String expiryYear;

    @NotBlank(message = "Le code de sécurité est requis")
    @Pattern(regexp = "\\d{3}", message = "Le code de sécurité doit contenir 3 chiffres")
    private String cvv;

    @NotBlank(message = "Le nom du titulaire est requis")
    @Size(min = 2, max = 100, message = "Le nom du titulaire doit contenir entre 2 et 100 caractères")
    private String cardholderName;

    @NotBlank(message = "L'email est requis")
    @Email(message = "Format d'email invalide")
    private String email;

    @NotNull(message = "L'ID du client est requis")
    private Long clientId;

    private Long panierId;
    private DeliveryInfoDTO deliveryInfo;
}