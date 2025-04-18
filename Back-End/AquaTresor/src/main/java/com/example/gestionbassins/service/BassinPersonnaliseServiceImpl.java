package com.example.gestionbassins.service;

import com.example.gestionbassins.dto.AccessoireDTO;
import com.example.gestionbassins.entities.Accessoire;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.BassinPersonnalise;
import com.example.gestionbassins.repos.BassinPersonnaliseRepository;
import com.example.gestionbassins.repos.BassinRepository;

import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.FileSystemException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BassinPersonnaliseServiceImpl implements BassinPersonnaliseService{ 

    @Autowired
    private BassinPersonnaliseRepository bassinPersonnaliseRepository;

    @Autowired
    private BassinRepository bassinRepository; // Ajout du repository pour Bassin

    private final String UPLOAD_DIR = "C:/shared/imagesaccessoiresbassin/";

    public BassinPersonnalise ajouterBassinPersonnalise(
            Long idBassin, // ID du bassin à personnaliser
            List<String> materiaux, // Liste des matériaux personnalisés
            List<String> dimensions, // Liste des dimensions personnalisées
            List<Accessoire> accessoires, // Liste des accessoires personnalisés
            List<MultipartFile> accessoireImages, // Liste des fichiers image pour les accessoires
            Integer dureeFabrication
    ) throws IOException {
        // Récupérer le bassin existant
        Bassin bassin = bassinRepository.findById(idBassin)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé"));

        // Sauvegarder les images des accessoires
        for (int i = 0; i < accessoires.size(); i++) {
            Accessoire accessoire = accessoires.get(i);
            MultipartFile file = accessoireImages.get(i);

            if (file != null && !file.isEmpty()) {
                String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                Path path = Paths.get(UPLOAD_DIR + fileName);
                Files.createDirectories(path.getParent());
                Files.write(path, file.getBytes());

                accessoire.setImagePath(fileName);
            }
        }

        // Créer le bassin personnalisé
        BassinPersonnalise bassinPersonnalise = new BassinPersonnalise();
        bassinPersonnalise.setBassin(bassin);
        bassinPersonnalise.setMateriaux(materiaux);
        bassinPersonnalise.setDimensions(dimensions);
        bassinPersonnalise.setAccessoires(accessoires);
        bassinPersonnalise.setDureeFabrication(dureeFabrication);
        
     // Correction : Associer chaque accessoire à son BassinPersonnalise avant d'ajouter les accessoires à la liste
        for (Accessoire accessoire : accessoires) {
            accessoire.setBassinPersonnalise(bassinPersonnalise);
        }
        bassinPersonnalise.setAccessoires(accessoires);

        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }
    
    @Transactional
    public BassinPersonnalise save(BassinPersonnalise bassinPersonnalise) {
        // Vérifier si le bassin est valide
        if (bassinPersonnalise.getBassin() == null) {
            throw new IllegalArgumentException("Le bassin est obligatoire.");
        }

        // Sauvegarde dans la base de données
        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }

    public List<BassinPersonnalise> listeBassinsPersonnalises() {
        return bassinPersonnaliseRepository.findAll();
    }

    public BassinPersonnalise trouverBassinPersonnaliseParIdBassin(Long idBassin) {
        return bassinPersonnaliseRepository.trouverBassinPersonnaliseParIdBassin(idBassin);
    }
    
   /* public void uploadImageAccessoire(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);

        // Créfinir le nom du fichier
        String originalFileName = file.getOriginalFilename();
        String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        String fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;

        // Supprimer l'ancienne image si elle existe
        if (accessoire.getImagePath() != null) {
            Path oldFilePath = Paths.get(accessoire.getImagePath());
            if (Files.exists(oldFilePath)) {
                Files.delete(oldFilePath);
                System.out.println("Ancien fichier supprimé : " + oldFilePath);
            }
        }

        // Sauvegarder la nouvelle image
        Path filePath = uploadPath.resolve(fileName);
        Files.write(filePath, file.getBytes());

        // Mettre à jour le chemin de l'image dans l'accessoire
        accessoire.setImagePath(filePath.toString());
    }*/
    /*public void uploadImageAccessoire(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);
        
     // Vérifier que l'ID de l'accessoire n'est pas null
        if (accessoire.getIdAccessoire() == null) {
            throw new IllegalArgumentException("L'ID de l'accessoire est null. L'accessoire doit être sauvegardé en base de données avant de pouvoir uploader une image.");
        }

        // Créer le nom du fichier
        String originalFileName = file.getOriginalFilename();
        String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
        String fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;

        System.out.println("Nom du fichier généré : " + fileName);
        System.out.println("Chemin complet du fichier : " + uploadPath.resolve(fileName));
        
        if (accessoire.getImagePath() != null) {
            // Accessoire existant : conserver le même nom de fichier
            fileName = Paths.get(accessoire.getImagePath()).getFileName().toString();
        } else {
            // Nouvel accessoire : générer un nouveau nom de fichier
            fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;
        }

        System.out.println("Nom du fichier généré : " + fileName);
        System.out.println("Chemin complet du fichier : " + uploadPath.resolve(fileName));
        
        // Supprimer l'ancienne image si elle existe
        if (accessoire.getImagePath() != null) {
            Path oldFilePath = Paths.get(accessoire.getImagePath());
            if (Files.exists(oldFilePath)) {
                try {
                    Files.delete(oldFilePath);
                    System.out.println("Ancien fichier supprimé : " + oldFilePath);
                } catch (FileSystemException e) {
                    System.err.println("Erreur lors de la suppression du fichier : " + e.getMessage());
                    // Réessayer après un court délai
                    try {
                        Thread.sleep(1000); // Attendre 1 seconde
                        Files.delete(oldFilePath);
                        System.out.println("Ancien fichier supprimé après réessai : " + oldFilePath);
                    } catch (Exception ex) {
                        System.err.println("Échec de la suppression après réessai : " + ex.getMessage());
                    }
                }
            }
        }

        // Sauvegarder la nouvelle image
        Path filePath = uploadPath.resolve(fileName);
        System.out.println("Chemin du nouveau fichier : " + filePath);
        
        Files.write(filePath, file.getBytes());
        System.out.println("Nouveau fichier sauvegardé avec succès : " + filePath);


        // Mettre à jour le chemin de l'image dans l'accessoire
        accessoire.setImagePath(filePath.toString());
        System.out.println("Chemin de l'image mis à jour dans l'accessoire : " + filePath);
    }*/
    
    //fonctionnelle
  /*  public void uploadImageAccessoire(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);

        try {
            // Vérifier que l'ID de l'accessoire n'est pas null
            if (accessoire.getIdAccessoire() == null) {
                throw new IllegalArgumentException("L'ID de l'accessoire est null. L'accessoire doit être sauvegardé en base de données avant de pouvoir uploader une image.");
            }

            // Vérifier que le fichier n'est pas vide
            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("Le fichier image est vide ou null.");
            }

            // Générer le nom du fichier
            String originalFileName = file.getOriginalFilename();
            String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            String fileName;

            if (accessoire.getImagePath() != null) {
                // Accessoire existant : vérifier que l'ID correspond au nom de l'image
                Long extractedAccessoireId = extractAccessoireIdFromImageName(accessoire.getImagePath());

                System.out.println("ID de l'accessoire : " + accessoire.getIdAccessoire());
                System.out.println("Chemin de l'image existante : " + accessoire.getImagePath());
                System.out.println("ID extrait du nom de l'image : " + extractedAccessoireId);

                if (extractedAccessoireId == null || !extractedAccessoireId.equals(accessoire.getIdAccessoire())) {
                    throw new IllegalArgumentException("Le nom de l'image ne correspond pas à l'ID de l'accessoire.");
                }

                // Conserver le même nom de fichier
                fileName = Paths.get(accessoire.getImagePath()).getFileName().toString();
            } else {
                // Nouvel accessoire : générer un nouveau nom de fichier
                fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;
            }

            System.out.println("Nom du fichier généré : " + fileName);
            System.out.println("Chemin complet du fichier : " + uploadPath.resolve(fileName));

            // Supprimer l'ancienne image si elle existe
            if (accessoire.getImagePath() != null) {
                Path oldFilePath = Paths.get(accessoire.getImagePath());
                if (Files.exists(oldFilePath)) {
                    try {
                        Files.delete(oldFilePath);
                        System.out.println("Ancien fichier supprimé : " + oldFilePath);
                    } catch (FileSystemException e) {
                        System.err.println("Erreur lors de la suppression du fichier : " + e.getMessage());
                        // Réessayer après un court délai
                        try {
                            Thread.sleep(1000); // Attendre 1 seconde
                            Files.delete(oldFilePath);
                            System.out.println("Ancien fichier supprimé après réessai : " + oldFilePath);
                        } catch (Exception ex) {
                            System.err.println("Échec de la suppression après réessai : " + ex.getMessage());
                        }
                    }
                }
            }

            // Sauvegarder la nouvelle image
            Path filePath = uploadPath.resolve(fileName);
            System.out.println("Chemin du nouveau fichier : " + filePath);

            Files.write(filePath, file.getBytes());
            System.out.println("Nouveau fichier sauvegardé avec succès : " + filePath);

            // Mettre à jour le chemin de l'image dans l'accessoire
            accessoire.setImagePath(filePath.toString());
            System.out.println("Chemin de l'image mis à jour dans l'accessoire : " + filePath);
        } catch (Exception e) {
            // Log de l'erreur
            System.err.println("Erreur lors de l'upload de l'image de l'accessoire : " + e.getMessage());
            e.printStackTrace();
            throw e; // Relancer l'exception pour la gestion globale des erreurs
        }
    }*/
    
    public void uploadImageAccessoireForAdd(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);

        try {
            // Vérifier que l'ID de l'accessoire n'est pas null
            if (accessoire.getIdAccessoire() == null) {
                throw new IllegalArgumentException("L'ID de l'accessoire est null. L'accessoire doit être sauvegardé en base de données avant de pouvoir uploader une image.");
            }

            // Vérifier que le fichier n'est pas vide
            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("Le fichier image est vide ou null.");
            }

            // Générer le nom du fichier
            String originalFileName = file.getOriginalFilename();
            String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            String fileName;

            if (accessoire.getImagePath() != null) {
                // Accessoire existant : vérifier que l'ID correspond au nom de l'image
                Long extractedAccessoireId = extractAccessoireIdFromImageName(accessoire.getImagePath());

                System.out.println("ID de l'accessoire : " + accessoire.getIdAccessoire());
                System.out.println("Chemin de l'image existante : " + accessoire.getImagePath());
                System.out.println("ID extrait du nom de l'image : " + extractedAccessoireId);

                if (extractedAccessoireId == null || !extractedAccessoireId.equals(accessoire.getIdAccessoire())) {
                    // Si l'ID ne correspond pas, générer un nouveau nom de fichier
                    fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;
                } else {
                    // Conserver le même nom de fichier
                    fileName = Paths.get(accessoire.getImagePath()).getFileName().toString();
                }
            } else {
                // Nouvel accessoire : générer un nouveau nom de fichier
                fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;
            }

            System.out.println("Nom du fichier généré : " + fileName);
            System.out.println("Chemin complet du fichier : " + uploadPath.resolve(fileName));

            // Supprimer l'ancienne image si elle existe
            if (accessoire.getImagePath() != null) {
                Path oldFilePath = Paths.get(accessoire.getImagePath());
                if (Files.exists(oldFilePath)) {
                    try {
                        Files.delete(oldFilePath);
                        System.out.println("Ancien fichier supprimé : " + oldFilePath);
                    } catch (FileSystemException e) {
                        System.err.println("Erreur lors de la suppression du fichier : " + e.getMessage());
                        // Réessayer après un court délai
                        try {
                            Thread.sleep(1000); // Attendre 1 seconde
                            Files.delete(oldFilePath);
                            System.out.println("Ancien fichier supprimé après réessai : " + oldFilePath);
                        } catch (Exception ex) {
                            System.err.println("Échec de la suppression après réessai : " + ex.getMessage());
                        }
                    }
                }
            }

            // Sauvegarder la nouvelle image
            Path filePath = uploadPath.resolve(fileName);
            System.out.println("Chemin du nouveau fichier : " + filePath);

            Files.write(filePath, file.getBytes());
            System.out.println("Nouveau fichier sauvegardé avec succès : " + filePath);

            // Mettre à jour le chemin de l'image dans l'accessoire
            accessoire.setImagePath(filePath.toString());
            System.out.println("Chemin de l'image mis à jour dans l'accessoire : " + filePath);
        } catch (Exception e) {
            // Log de l'erreur
            System.err.println("Erreur lors de l'upload de l'image de l'accessoire : " + e.getMessage());
            e.printStackTrace();
            throw e; // Relancer l'exception pour la gestion globale des erreurs
        }
    }

    // Méthode pour extraire l'ID de l'accessoire du nom de l'image
    private Long extractAccessoireIdFromImageName(String imageName) {
        if (imageName == null || !imageName.contains("_")) {
            return null; // Le nom de l'image ne correspond pas au format attendu
        }

        try {
            // Extraire la partie après le premier "_" et avant le "."
            String idPart = imageName.substring(imageName.indexOf("_") + 1, imageName.lastIndexOf("."));
            return Long.parseLong(idPart); // Convertir en Long
        } catch (Exception e) {
            System.err.println("Erreur lors de l'extraction de l'ID de l'accessoire depuis le nom de l'image : " + imageName);
            return null;
        }
    }

    
    @Transactional
    public void supprimerBassinPersonnalise(Long idBassinPersonnalise) {
        // Récupérer le bassin personnalisé
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin personnalisé non trouvé avec l'ID : " + idBassinPersonnalise));

        // Supprimer les fichiers images associés
        supprimerImagesAccessoires(bassinPersonnalise);

        // Supprimer le bassin personnalisé de la base de données
        bassinPersonnaliseRepository.delete(bassinPersonnalise);
    }
    
	private final Path imageStorageLocation = Paths.get("C:/shared/imagesaccessoiresbassin").toAbsolutePath().normalize();


    private void supprimerImagesAccessoires(BassinPersonnalise bassinPersonnalise) {
        // Parcourir tous les accessoires du bassin personnalisé
        for (Accessoire accessoire : bassinPersonnalise.getAccessoires()) {
            if (accessoire.getImagePath() != null) {
                try {
                    // Extraire le nom du fichier à partir du chemin complet
                    String fileName = Paths.get(accessoire.getImagePath()).getFileName().toString();

                    // Construire le chemin complet du fichier
                    Path filePath = imageStorageLocation.resolve(fileName).normalize();

                    // Supprimer le fichier s'il existe
                    if (Files.exists(filePath)) {
                        Files.delete(filePath);
                        System.out.println("Fichier supprimé : " + filePath);
                    }
                } catch (IOException e) {
                    System.err.println("Erreur lors de la suppression du fichier : " + e.getMessage());
                }
            }
        }
    }
    
    public List<Accessoire> convertirAccessoireDTOEnAccessoire(List<AccessoireDTO> accessoireDTOs) {
        return accessoireDTOs.stream()
                .map(accessoireDTO -> {
                    Accessoire accessoire = new Accessoire();
                    accessoire.setIdAccessoire(accessoireDTO.getIdAccessoire());
                    accessoire.setNomAccessoire(accessoireDTO.getNomAccessoire());
                    accessoire.setPrixAccessoire(accessoireDTO.getPrixAccessoire());
                    accessoire.setImagePath(accessoireDTO.getImagePath());
                    return accessoire;
                })
                .collect(Collectors.toList());
    }
    
    /*@Transactional
    public BassinPersonnalise mettreAJourBassinPersonnalise(
            Long idBassinPersonnalise,
            Long idBassin,
            List<String> materiaux,
            List<String> dimensions,
            List<Accessoire> accessoires,
            List<MultipartFile> accessoireImages
    ) throws IOException {
        // Récupérer le bassin personnalisé existant
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin personnalisé non trouvé avec l'ID : " + idBassinPersonnalise));

        // Récupérer le bassin existant par son ID
        Bassin bassin = bassinRepository.findById(idBassin)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + idBassin));

        // Mettre à jour les propriétés du bassin personnalisé
        bassinPersonnalise.setBassin(bassin);
        bassinPersonnalise.setMateriaux(materiaux);
        bassinPersonnalise.setDimensions(dimensions);

        // Log des IDs des accessoires avant la suppression
        System.out.println("IDs des accessoires avant suppression :");
        for (Accessoire accessoire : bassinPersonnalise.getAccessoires()) {
            System.out.println("Accessoire ID : " + accessoire.getIdAccessoire());
        }
        
        // Supprimer les anciens accessoires
        bassinPersonnalise.getAccessoires().clear();

     // Log des IDs des nouveaux accessoires avant ajout
        System.out.println("IDs des nouveaux accessoires avant ajout :");
        for (Accessoire accessoire : accessoires) {
            System.out.println("Accessoire ID : " + accessoire.getIdAccessoire());
        }
        
        // Ajouter les nouveaux accessoires
        for (Accessoire accessoire : accessoires) {
            accessoire.setBassinPersonnalise(bassinPersonnalise);
            bassinPersonnalise.getAccessoires().add(accessoire);
        }

        // Log des IDs des accessoires après ajout
        System.out.println("IDs des accessoires après ajout :");
        for (Accessoire accessoire : bassinPersonnalise.getAccessoires()) {
            System.out.println("Accessoire ID : " + accessoire.getIdAccessoire());
        }
        
        // Sauvegarder le bassin personnalisé pour obtenir les IDs des accessoires
        bassinPersonnalise = bassinPersonnaliseRepository.save(bassinPersonnalise);

        // Log des IDs des accessoires après sauvegarde
        System.out.println("IDs des accessoires après sauvegarde :");
        for (Accessoire accessoire : bassinPersonnalise.getAccessoires()) {
            System.out.println("Accessoire ID : " + accessoire.getIdAccessoire());
        }
        
        // Sauvegarder les images des accessoires
        if (accessoireImages != null && !accessoireImages.isEmpty()) {
            for (int i = 0; i < accessoireImages.size(); i++) {
                MultipartFile file = accessoireImages.get(i);

                if (file != null && !file.isEmpty()) {
                	// Associer l'image au bon accessoire
                    if (i < bassinPersonnalise.getAccessoires().size()) {
                        Accessoire accessoire = bassinPersonnalise.getAccessoires().get(i);
                        uploadImageAccessoire(bassinPersonnalise, accessoire, file);
                    }
                }
            }
        }

        // Sauvegarder le bassin personnalisé mis à jour
        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }*/
    
    //fonctionnelle
 /*   @Transactional
    public BassinPersonnalise mettreAJourBassinPersonnalise(
            Long idBassinPersonnalise,
            Long idBassin,
            List<String> materiaux,
            List<String> dimensions,
            List<Accessoire> accessoires,
            List<MultipartFile> accessoireImages
    ) throws IOException {
        // Récupérer le bassin personnalisé existant
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin personnalisé non trouvé avec l'ID : " + idBassinPersonnalise));

        // Récupérer le bassin existant par son ID
        Bassin bassin = bassinRepository.findById(idBassin)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + idBassin));

        // Mettre à jour les propriétés du bassin personnalisé
        bassinPersonnalise.setBassin(bassin);
        bassinPersonnalise.setMateriaux(materiaux);
        bassinPersonnalise.setDimensions(dimensions);

        // Liste des accessoires existants avant la mise à jour
        List<Accessoire> accessoiresExistants = new ArrayList<>(bassinPersonnalise.getAccessoires());

        // Supprimer les anciens accessoires
        bassinPersonnalise.getAccessoires().clear();

        // Ajouter les nouveaux accessoires
        for (Accessoire accessoire : accessoires) {
            // Vérifier si l'accessoire existe déjà
            Optional<Accessoire> accessoireExistant = accessoiresExistants.stream()
                    .filter(a -> a.getIdAccessoire() != null && a.getIdAccessoire().equals(accessoire.getIdAccessoire()))
                    .findFirst();

            if (accessoireExistant.isPresent()) {
                // Accessoire existant : conserver l'ID et le chemin de l'image
                Accessoire existingAccessoire = accessoireExistant.get();
                accessoire.setIdAccessoire(existingAccessoire.getIdAccessoire());
                accessoire.setImagePath(existingAccessoire.getImagePath());
            } else {
                // Nouvel accessoire : associer au bassin personnalisé
                accessoire.setBassinPersonnalise(bassinPersonnalise);
            }
            bassinPersonnalise.getAccessoires().add(accessoire);
        }

        // Sauvegarder le bassin personnalisé pour obtenir les IDs des nouveaux accessoires
        bassinPersonnalise = bassinPersonnaliseRepository.save(bassinPersonnalise);

        // Sauvegarder les images des accessoires
        if (accessoireImages != null && !accessoireImages.isEmpty()) {
            for (int i = 0; i < accessoireImages.size(); i++) {
                MultipartFile file = accessoireImages.get(i);

                if (file != null && !file.isEmpty()) {
                    // Associer l'image au bon accessoire
                    if (i < bassinPersonnalise.getAccessoires().size()) {
                        Accessoire accessoire = bassinPersonnalise.getAccessoires().get(i);
                        uploadImageAccessoireForUpdate(bassinPersonnalise, accessoire, file);
                    }
                }
            }
        }

        // Sauvegarder le bassin personnalisé mis à jour
        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }

    public void uploadImageAccessoireForUpdate(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);

        try {
            // Vérifier que l'ID de l'accessoire n'est pas null
            if (accessoire.getIdAccessoire() == null) {
                throw new IllegalArgumentException("L'ID de l'accessoire est null. L'accessoire doit être sauvegardé en base de données avant de pouvoir uploader une image.");
            }

            // Vérifier que le fichier n'est pas vide
            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("Le fichier image est vide ou null.");
            }

            // Générer le nom du fichier
            String originalFileName = file.getOriginalFilename();
            String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            String fileName;

            if (accessoire.getImagePath() != null) {
                // Accessoire existant : conserver le même nom de fichier
                fileName = Paths.get(accessoire.getImagePath()).getFileName().toString();
            } else {
                // Nouvel accessoire : générer un nouveau nom de fichier
                fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;
            }

            System.out.println("Nom du fichier généré pour la mise à jour : " + fileName);
            System.out.println("Chemin complet du fichier : " + uploadPath.resolve(fileName));

            // Supprimer l'ancienne image si elle existe
            if (accessoire.getImagePath() != null) {
                Path oldFilePath = Paths.get(accessoire.getImagePath());
                if (Files.exists(oldFilePath)) {
                    try {
                        Files.delete(oldFilePath);
                        System.out.println("Ancien fichier supprimé : " + oldFilePath);
                    } catch (FileSystemException e) {
                        System.err.println("Erreur lors de la suppression du fichier : " + e.getMessage());
                        // Réessayer après un court délai
                        try {
                            Thread.sleep(1000); // Attendre 1 seconde
                            Files.delete(oldFilePath);
                            System.out.println("Ancien fichier supprimé après réessai : " + oldFilePath);
                        } catch (Exception ex) {
                            System.err.println("Échec de la suppression après réessai : " + ex.getMessage());
                        }
                    }
                }
            }

            // Sauvegarder la nouvelle image
            Path filePath = uploadPath.resolve(fileName);
            Files.write(filePath, file.getBytes());
            System.out.println("Nouveau fichier sauvegardé avec succès : " + filePath);

            // Mettre à jour le chemin de l'image dans l'accessoire
            accessoire.setImagePath(filePath.toString());
            System.out.println("Chemin de l'image mis à jour dans l'accessoire : " + filePath);
        } catch (Exception e) {
            // Log de l'erreur
            System.err.println("Erreur lors de l'upload de l'image de l'accessoire pour la mise à jour : " + e.getMessage());
            e.printStackTrace();
            throw e; // Relancer l'exception pour la gestion globale des erreurs
        }
    }
*/
    @Transactional
    public BassinPersonnalise mettreAJourBassinPersonnalise(
            Long idBassinPersonnalise,
            Long idBassin,
            List<String> materiaux,
            List<String> dimensions,
            List<Accessoire> accessoires,
            List<MultipartFile> accessoireImages,
            Integer dureeFabrication
    ) throws IOException {
        // Récupérer le bassin personnalisé existant
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin personnalisé non trouvé avec l'ID : " + idBassinPersonnalise));

        // Récupérer le bassin existant par son ID
        Bassin bassin = bassinRepository.findById(idBassin)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + idBassin));

        // Mettre à jour les propriétés du bassin personnalisé
        bassinPersonnalise.setBassin(bassin);
        bassinPersonnalise.setMateriaux(materiaux);
        bassinPersonnalise.setDimensions(dimensions);
        bassinPersonnalise.setDureeFabrication(dureeFabrication);

        // Récupérer les accessoires existants
        List<Accessoire> accessoiresExistants = new ArrayList<>(bassinPersonnalise.getAccessoires());

        // Parcourir les accessoires reçus dans la requête
        for (Accessoire accessoire : accessoires) {
            // Afficher l'ID de l'accessoire reçu
            System.out.println("ID de l'accessoire reçu : " + accessoire.getIdAccessoire());

            // Vérifier si l'accessoire existe déjà
            Optional<Accessoire> accessoireExistant = accessoiresExistants.stream()
                    .filter(a -> a.getIdAccessoire() != null && a.getIdAccessoire().equals(accessoire.getIdAccessoire()))
                    .findFirst();

            if (accessoireExistant.isPresent()) {
                // Accessoire existant : mettre à jour les propriétés
                Accessoire existingAccessoire = accessoireExistant.get();
                existingAccessoire.setNomAccessoire(accessoire.getNomAccessoire());
                existingAccessoire.setPrixAccessoire(accessoire.getPrixAccessoire());
            } else {
                // Nouvel accessoire : associer au bassin personnalisé
                accessoire.setBassinPersonnalise(bassinPersonnalise);
                bassinPersonnalise.getAccessoires().add(accessoire);
            }
        }

        // Sauvegarder les images des accessoires
        if (accessoireImages != null && !accessoireImages.isEmpty()) {
            for (int i = 0; i < accessoireImages.size(); i++) {
                MultipartFile file = accessoireImages.get(i);

                if (file != null && !file.isEmpty()) {
                    // Associer l'image au bon accessoire
                    if (i < bassinPersonnalise.getAccessoires().size()) {
                        Accessoire accessoire = bassinPersonnalise.getAccessoires().get(i);
                        uploadImageAccessoireForUpdate(bassinPersonnalise, accessoire, file);
                    }
                }
            }
        }

        // Sauvegarder le bassin personnalisé mis à jour
        return bassinPersonnaliseRepository.save(bassinPersonnalise);
    }
   
    public void uploadImageAccessoireForUpdate(BassinPersonnalise bassinPersonnalise, Accessoire accessoire, MultipartFile file) throws IOException {
        String uploadDir = "C:/shared/imagesaccessoiresbassin/";
        Path uploadPath = Paths.get(uploadDir);

        try {
            // Vérifier que l'ID de l'accessoire n'est pas null
            if (accessoire.getIdAccessoire() == null) {
                throw new IllegalArgumentException("L'ID de l'accessoire est null. L'accessoire doit être sauvegardé en base de données avant de pouvoir uploader une image.");
            }

            // Afficher l'ID de l'accessoire
            System.out.println("ID de l'accessoire lors de la mise à jour de l'image : " + accessoire.getIdAccessoire());

            // Vérifier que le fichier n'est pas vide
            if (file == null || file.isEmpty()) {
                return; // Ne rien faire si aucune image n'est fournie
            }

            // Générer le nom du fichier
            String originalFileName = file.getOriginalFilename();
            String extension = originalFileName.substring(originalFileName.lastIndexOf("."));
            String fileName = bassinPersonnalise.getIdBassinPersonnalise() + "_" + accessoire.getIdAccessoire() + extension;

            System.out.println("Nom du fichier généré pour la mise à jour : " + fileName);
            System.out.println("Chemin complet du fichier : " + uploadPath.resolve(fileName));

            // Supprimer l'ancienne image si elle existe
            if (accessoire.getImagePath() != null) {
                Path oldFilePath = Paths.get(accessoire.getImagePath());
                if (Files.exists(oldFilePath)) {
                    try {
                        Files.delete(oldFilePath);
                        System.out.println("Ancien fichier supprimé : " + oldFilePath);
                    } catch (FileSystemException e) {
                        System.err.println("Erreur lors de la suppression du fichier : " + e.getMessage());
                        // Réessayer après un court délai
                        try {
                            Thread.sleep(1000); // Attendre 1 seconde
                            Files.delete(oldFilePath);
                            System.out.println("Ancien fichier supprimé après réessai : " + oldFilePath);
                        } catch (Exception ex) {
                            System.err.println("Échec de la suppression après réessai : " + ex.getMessage());
                        }
                    }
                }
            }

            // Sauvegarder la nouvelle image
            Path filePath = uploadPath.resolve(fileName);
            Files.write(filePath, file.getBytes());
            System.out.println("Nouveau fichier sauvegardé avec succès : " + filePath);

            // Mettre à jour le chemin de l'image dans l'accessoire
            accessoire.setImagePath(filePath.toString());
            System.out.println("Chemin de l'image mis à jour dans l'accessoire : " + filePath);
        } catch (Exception e) {
            // Log de l'erreur
            System.err.println("Erreur lors de l'upload de l'image de l'accessoire pour la mise à jour : " + e.getMessage());
            e.printStackTrace();
            throw e; // Relancer l'exception pour la gestion globale des erreurs
        }
    }
    
    public List<Accessoire> getAccessoiresByBassinPersonnaliseId(Long idBassinPersonnalise) {
        return bassinPersonnaliseRepository.findById(idBassinPersonnalise)
                .orElseThrow(() -> new RuntimeException("Bassin personnalisé non trouvé avec l'ID : " + idBassinPersonnalise))
                .getAccessoires();
    }
    
    public Map<String, Object> getOptionsForBassin(Long idBassin) {
        // Récupérer le bassin personnalisé associé à l'ID du bassin
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.trouverBassinPersonnaliseParIdBassin(idBassin);

        if (bassinPersonnalise == null) {
            throw new RuntimeException("Aucun bassin personnalisé trouvé pour l'ID du bassin : " + idBassin);
        }

        // Récupérer les matériaux, dimensions et accessoires
        List<String> materiaux = bassinPersonnalise.getMateriaux();
        List<String> dimensions = bassinPersonnalise.getDimensions();
        List<Accessoire> accessoires = bassinPersonnalise.getAccessoires();

        // Construire la réponse
        Map<String, Object> options = new HashMap<>();
        options.put("materiaux", materiaux);
        options.put("dimensions", dimensions);
        options.put("accessoires", accessoires);

        return options;
    }
    
    public BassinPersonnalise getBassinPersonnaliseByBassinId(Long idBassin) {
        return bassinPersonnaliseRepository.findByBassinId(idBassin);
    }
}