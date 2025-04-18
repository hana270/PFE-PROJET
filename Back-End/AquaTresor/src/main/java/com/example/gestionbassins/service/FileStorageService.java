package com.example.gestionbassins.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;

@Service
public class FileStorageService {
    private final String uploadDir = "C:/shared/images/";  // 📌 Externaliser si possible

    public FileStorageService() throws IOException {
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
            System.out.println("Dossier de stockage créé: " + uploadDir);
        }
    }

    /**
     * Sauvegarde un fichier sur le disque et retourne son nom
     */
    public String saveFile(Long idBassin, MultipartFile file, int imageNumber) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier ne peut pas être vide.");
        }

        // Obtenir l'extension du fichier original
        String originalFileName = file.getOriginalFilename();
        String extension = (originalFileName != null && originalFileName.contains(".")) 
            ? originalFileName.substring(originalFileName.lastIndexOf(".")) 
            : "";

        // Générer un nom de fichier sous la forme : idBassin_imageNumber.extension
        String fileName = idBassin + "_" + imageNumber + extension;
        Path filePath = Paths.get(uploadDir, fileName);

        // Écrire le fichier sur le disque (sans écraser les anciens)
        Files.write(filePath, file.getBytes());

        // Vérifier que le fichier est bien écrit
        if (Files.exists(filePath)) {
            System.out.println("Fichier sauvegardé avec succès: " + filePath);
        }

        return fileName; // Retourne le nom du fichier pour l'enregistrement en base de données
    }
}
