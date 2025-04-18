package com.example.gestionbassins.restcontrollers;

import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.ImageBassin;
import com.example.gestionbassins.repos.ImageBassinRepository;
import com.example.gestionbassins.service.BassinService;
import com.example.gestionbassins.service.FileStorageService;
import com.example.gestionbassins.service.ImageBassinService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;

@RestController
@RequestMapping("/api/imagesBassin")
@CrossOrigin(origins = "http://localhost:4200")
public class ImageBassinRestController {

    @Autowired
    private ImageBassinService imageBassinService;

    @Autowired
    private BassinService bassinService;
    
    @Autowired
    FileStorageService fileStorageService;
    
    @Autowired
    ImageBassinRepository imageBassinRepository;

    //Stocker les images dans un dossier + leur path dans la bdd
    @RequestMapping(value = "/uploadFS/{id}", method = RequestMethod.POST)
    public void uploadImageFS(@RequestParam("image") MultipartFile[] files, @PathVariable("id") Long idBassin) throws IOException {
        String uploadDir = "C:/shared/images/";  // 📌 Dossier de stockage
        Path uploadPath = Paths.get(uploadDir);

        // 📌 Créer le dossier s'il n'existe pas
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // 📌 Vérifier si le bassin existe
        Bassin b = bassinService.getBassin(idBassin);
        if (b == null) {
            throw new IllegalArgumentException("Bassin introuvable avec l'ID : " + idBassin);
        }

        // 📌 Récupérer le dernier ID d’image enregistré en base pour ce bassin
        Integer lastImageId = imageBassinRepository.findLastImageIdByBassin(idBassin);
        int newImageId = (lastImageId == null) ? 1 : lastImageId + 1;  // 📌 Commencer à 1 si aucune image

        // 📌 Parcourir chaque fichier
        for (MultipartFile file : files) {
            // 📌 Obtenir l'extension du fichier
            String originalFileName = file.getOriginalFilename();
            String extension = (originalFileName != null && originalFileName.contains(".")) 
                ? originalFileName.substring(originalFileName.lastIndexOf(".")) 
                : "";

            // 📌 Générer le nom de fichier : idBassin_idImage.extension
            String fileName = idBassin + "_" + newImageId + extension;

            // 📌 Chemin complet du fichier
            Path filePath = uploadPath.resolve(fileName);

            // 📌 Écrire l’image sur le disque (sans supprimer les anciennes images)
            Files.write(filePath, file.getBytes());

            // 📌 Créer et sauvegarder l'entité ImageBassin en base
            ImageBassin imageBassin = new ImageBassin();
            imageBassin.setName(fileName);
            imageBassin.setType(file.getContentType());  // Type MIME de l'image
            imageBassin.setImage(file.getBytes());  // 📌 Sauvegarde du contenu binaire
            imageBassin.setImagePath(fileName);  // 📌 Mettre le bon chemin ici
            imageBassin.setBassin(b);

            imageBassinRepository.save(imageBassin);  // 📌 Enregistrer dans la base

            System.out.println("Image enregistrée avec succès : " + fileName);

            // 📌 Incrémenter l'ID pour la prochaine image
            newImageId++;
        }
    }

    @RequestMapping(value = "/loadfromFS/{id}", method = RequestMethod.GET, produces = MediaType.IMAGE_JPEG_VALUE)
    public byte[] getImageFS(@PathVariable("id") Long id) throws IOException {
        Bassin ev = bassinService.getBassin(id);
        
        // Afficher le chemin de l'image stockée dans l'objet Bassin
        System.out.println("ImagePath dans l'événement: " + ev.getImagePath());
        
        // 📌 Nouveau chemin correct
        String fullPath = "C:/shared/images/" + ev.getImagePath();
        Path imagePath = Paths.get(fullPath);
        
        // Lister les fichiers dans le dossier pour debug
        Files.list(Paths.get("C:/shared/images/"))
             .forEach(file -> System.out.println("Fichier trouvé: " + file.getFileName()));
        
        // Vérifier si le fichier existe
        if (!Files.exists(imagePath)) {
            throw new RuntimeException("Image non trouvée pour l'événement avec l'ID: " + id 
                + "\nChemin recherché: " + fullPath);
        }
        
        return Files.readAllBytes(imagePath);
    }
    
    //Affiche les images d'un bassin
    @GetMapping("/bassin/{idBassin}")
    public ResponseEntity<List<ImageBassin>> getImagesByBassin(@PathVariable("idBassin") Long idBassin) {
        List<ImageBassin> images = imageBassinService.getImagesByBassin(idBassin);
        return ResponseEntity.ok(images);
    }
    
    @DeleteMapping("/delete/{idImage}")
    public ResponseEntity<?> deleteImage(@PathVariable("idImage") Long idImage) {
        try {
            imageBassinService.deleteImage(idImage);
            return ResponseEntity.ok("Image supprimée avec succès.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de la suppression de l'image : " + e.getMessage());
        }
    }
    
    
 // Récupérer une image depuis le dossier et la retourner sous forme de réponse HTTP
    @GetMapping("/getFS/{imageName}")
    public ResponseEntity<byte[]> getImage(@PathVariable("imageName") String imageName) {
        String uploadDir = "C:/shared/images/";
        Path imagePath = Paths.get(uploadDir, imageName);

        if (!Files.exists(imagePath)) {
            return ResponseEntity.notFound().build();
        }

        try {
            byte[] imageBytes = Files.readAllBytes(imagePath);
            return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(imageBytes);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

	/******************/
}
