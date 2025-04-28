package com.example.gestionbassins.restcontrollers;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.commons.io.FilenameUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.gestionbassins.dto.BassinDTO;
import com.example.gestionbassins.dto.TransactionDTO;
import com.example.gestionbassins.dto.UpdateStockRequest;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.ImageBassin;
import com.example.gestionbassins.entities.Transaction;
import com.example.gestionbassins.repos.BassinRepository;
import com.example.gestionbassins.repos.ImageBassinRepository;
import com.example.gestionbassins.service.BassinService;
import com.example.gestionbassins.service.ImageBassinService;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.web.bind.annotation.PutMapping;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.scheduling.annotation.Scheduled;
import com.example.gestionbassins.repos.TransactionRepository;
import com.example.gestionbassins.service.NotificationService;
import com.example.gestionbassins.service.UserServiceClient;



@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:4200", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
public class BassinRestController {

	private final String uploadDir = "C:/shared/images/"; 
	
    @Autowired
    BassinService bassinService; 
    
    @Autowired
    ImageBassinService imageBassinService;
    
    @Autowired
    ImageBassinRepository imageBassinRepository;
    
    @Autowired
    BassinRepository bassinRepository;
    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private NotificationService notificationService;
    @Autowired
    private UserServiceClient userServiceClient;
    /*******************Gestion bassin********************/
    
    // Get all events
   @RequestMapping(path="all", method=RequestMethod.GET)
    public List<Bassin> getAllBassins() {
        return bassinService.getAllBassins();
    }
    
   
    @RequestMapping(value="getbyid/{idBassin}", method=RequestMethod.GET)
    public Bassin getBassinById(@PathVariable("idBassin") Long id) {
        return bassinService.getBassin(id);
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping("/addbassin")
    public Bassin createBassin(@RequestBody Bassin bassin) {
   	 System.out.println(bassin);
       System.out.println("Received prixBassin: " + bassin.getPrix()); // Debugging
       return bassinService.saveBassin(bassin);
   }
    
    @PostMapping("/addBassinWithImages") 
    public ResponseEntity<?> addBassinWithImages(
            @RequestParam("bassin") String bassinJson,
            @RequestParam("images") List<MultipartFile> images) {
        try {
        	
        	// Log received data
            System.out.println("Received bassin JSON: " + bassinJson);
            System.out.println("Received images count: " + (images != null ? images.size() : 0));
            
            // 1. Convertir le JSON en objet Bassin
            ObjectMapper mapper = new ObjectMapper();
            Bassin bassin = mapper.readValue(bassinJson, Bassin.class);

            // 2. Définir les valeurs par défaut des métadonnées
            bassin.setArchive(false);
            bassin.setQuantity(0);
            bassin.setDateAjout(new Date());
            bassin.setDateDerniereModification(new Date());
            
            // 2. Vérifier si l'ID existe (Mise à jour)
            if (bassin.getIdBassin() != null) {
                bassin = bassinService.getBassin(bassin.getIdBassin());
                if (bassin == null) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body("Bassin introuvable avec ID : " + bassin.getIdBassin());
                }
            } else {
                // 3. Si l'ID est null, enregistrer le bassin
                bassin = bassinService.saveBassin(bassin);
            }
            
            // 4. Ajouter les images associées
            if (images != null && !images.isEmpty()) {
                imageBassinService.uploadImages(bassin, images.toArray(new MultipartFile[0]));
            }

            // 🔥 Recharger le bassin pour inclure les images
            Bassin updatedBassin = bassinService.getBassin(bassin.getIdBassin());

            return ResponseEntity.ok(updatedBassin);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erreur lors de l'ajout du bassin et des images : " + e.getMessage());
        }
    }

    @PutMapping("/updatebassin/{idBassin}")
    public Bassin updateBassin(@PathVariable("idBassin") Long idBassin, @RequestBody Bassin bassin) {
        
    	
    	
    	bassin.setIdBassin(idBassin); // Set the ID to ensure the correct event is updated
        return bassinService.updateBassin(bassin);
    }
    
    @PostMapping("/updateBassinWithImg")
    public Bassin updateBassinWithImg(@RequestPart("bassin") String bassinJson,
                                      @RequestPart(value = "files", required = false) MultipartFile[] files) throws IOException {
        ObjectMapper objectMapper = new ObjectMapper();
        Bassin b = objectMapper.readValue(bassinJson, Bassin.class);

        // Récupérer le bassin existant depuis la base de données
        Bassin existingBassin = bassinRepository.findByIdWithImages(b.getIdBassin())
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + b.getIdBassin()));

        // Mise à jour des propriétés du bassin
        existingBassin.setNomBassin(b.getNomBassin());
        existingBassin.setDescription(b.getDescription());
        existingBassin.setPrix(b.getPrix());
        existingBassin.setMateriau(b.getMateriau());
        existingBassin.setCouleur(b.getCouleur());
        existingBassin.setDimensions(b.getDimensions());
        existingBassin.setDisponible(b.isDisponible());
        existingBassin.setStock(b.getStock());
        existingBassin.setCategorie(b.getCategorie());

        // Traitement des fichiers images
        if (files != null && files.length > 0) {
            for (MultipartFile file : files) {
                if (file != null && !file.isEmpty()) {
                    String originalFilename = file.getOriginalFilename();

                    // Extraire l'index de l'image à partir du nom du fichier (format : "id_index.extension")
                    String[] filenameParts = originalFilename.split("_");
                    if (filenameParts.length > 1) {
                        try {
                            int imageIndex = Integer.parseInt(filenameParts[1].split("\\.")[0]) - 1; // Index commence à 0

                            // Vérifier que l'index est valide
                            if (imageIndex >= 0 && imageIndex < existingBassin.getImagesBassin().size()) {
                                ImageBassin oldImage = existingBassin.getImagesBassin().get(imageIndex);

                                // Supprimer l'ancienne image du dossier
                                Path oldImagePath = Paths.get(uploadDir + oldImage.getName());
                                Files.deleteIfExists(oldImagePath);

                                // Générer un nouveau nom de fichier
                                String extension = FilenameUtils.getExtension(originalFilename);
                                String newImageName = b.getIdBassin() + "_" + (imageIndex + 1) + "." + extension;

                                // Sauvegarder la nouvelle image dans le dossier
                                Path newImagePath = Paths.get(uploadDir + newImageName);
                                Files.copy(file.getInputStream(), newImagePath, StandardCopyOption.REPLACE_EXISTING);

                                // Créer un nouvel objet ImageBassin
                                ImageBassin newImage = new ImageBassin();
                                newImage.setName(newImageName); // Nom du fichier
                                newImage.setType(file.getContentType());
                                newImage.setImage(file.getBytes());
                                newImage.setBassin(existingBassin);

                                // Définir imagePath avec uniquement le nom du fichier
                                newImage.setImagePath(newImageName);

                                // Remplacer l'ancienne image par la nouvelle
                                existingBassin.getImagesBassin().set(imageIndex, newImage);
                            }
                        } catch (NumberFormatException e) {
                            throw new RuntimeException("Format de nom de fichier invalide : " + originalFilename);
                        } catch (IOException e) {
                            throw new RuntimeException("Erreur lors de l'enregistrement de l'image : " + e.getMessage());
                        }
                    }
                }
            }
        }

        // Sauvegarder et retourner le bassin mis à jour
        return bassinRepository.save(existingBassin);
    }

    @DeleteMapping("deletebassin/{idBassin}")
    public ResponseEntity<?> deleteBassin(@PathVariable("idBassin") Long idBassin) {
        try {
            bassinService.deleteBassinById(idBassin);
            return ResponseEntity.ok().build(); // Return 200 OK on success
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body("Error deleting bassin: " + e.getMessage());
        }
    }
    
    //Affiche la liste des bassin appartient à une catégorie 
    @RequestMapping(value="/Categories/{idCategorie}", method=RequestMethod.GET)
    public List<Bassin> getBassinByCategorieId(@PathVariable("idCategorie") Long idCategorie) {
        return bassinService.findByCategorieIdCategorie(idCategorie);
    }
    
    @RequestMapping(value="/bassinByName/{nom}",method = RequestMethod.GET)
    public List<Bassin> findByNomBassinContains(@PathVariable("nom") String nom) {
    	return bassinService.findByNomBassinContains(nom);
    } 
    
    /*******************Gestion Quantité & archive & transaction********************/

   
    @PostMapping("/{id}/desarchiver")
    public Bassin desarchiverBassin(
        @PathVariable("id") Long id, 
        @RequestParam("nouvelleQuantite") int nouvelleQuantite) {
        return bassinService.desarchiverBassin(id, nouvelleQuantite);
    }

    @PostMapping("/{id}/mettre-a-jour-quantite")
    public Bassin mettreAJourQuantite(
        @PathVariable("id") Long id, 
        @RequestParam("quantite") int quantite, 
        @RequestParam("raison") String raison) {
        
        Bassin bassin = bassinService.mettreAJourQuantite(id, quantite, raison);
        
     
        
        return bassin;
    }

    @GetMapping("/non-archives")
    public List<Bassin> getBassinsNonArchives() {
        return bassinService.getBassinsNonArchives();
    }

    @GetMapping("/archives")
    public List<Bassin> getBassinsArchives() {
        return bassinService.getBassinsArchives();
    }

    @GetMapping("/transactions")
    public List<Transaction> getTransactions() {
        return bassinService.getTransactions();
    }

    @GetMapping("/notifier-stock-faible")
    public void notifierStockFaible() {
        bassinService.notifierStockFaible();
    }
   

    
    /***********************/
    
    private BassinDTO convertToDTO(Bassin bassin) {
        BassinDTO dto = new BassinDTO();
        dto.setIdBassin(bassin.getIdBassin());
        dto.setNomBassin(bassin.getNomBassin());
        dto.setDescription(bassin.getDescription());
        dto.setPrix(bassin.getPrix());
        dto.setMateriau(bassin.getMateriau());
        dto.setCouleur(bassin.getCouleur());
        dto.setDimensions(bassin.getDimensions());
        dto.setDisponible(bassin.isDisponible());
        dto.setStock(bassin.getStock());
        dto.setArchive(bassin.isArchive());
        dto.setImagePath(bassin.getImagePath());
        
        if (bassin.getCategorie() != null) {
            dto.setCategorieId(bassin.getCategorie().getIdCategorie());
        }
        
        return dto;
    }
    
    @GetMapping("/{id}")
    public BassinDTO getBassinDetails(@PathVariable Long id) {
        Bassin bassin = bassinService.getBassin(id);
        return convertToDTO(bassin);
    }
    @PostMapping("/update-stock")
    public ResponseEntity<?> updateStock(@RequestBody TransactionDTO transactionDTO) {
        try {
            Bassin bassin = bassinService.adjustStock(
                transactionDTO.getBassinId(), 
                transactionDTO.getQuantite(), 
                transactionDTO.getRaison(),
                transactionDTO.getTypeOperation(),
                transactionDTO.getUtilisateur()
            );
            
            // Archivage automatique si stock = 0
            if (bassin.getStock() == 0 && !bassin.isArchive()) {
                bassin = bassinService.archiverBassin(bassin.getIdBassin());
            }
            
            return ResponseEntity.ok(bassin);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
    
   
   
    @GetMapping("/transactions/{bassinId}")
    public List<Transaction> getBassinTransactions(@PathVariable Long bassinId) {
        return bassinService.getBassinTransactions(bassinId);
    }

    @GetMapping(value = "/rapport/bassin/{id}", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generateBassinStockReport(
            @PathVariable("id") Long id,
            @RequestParam("startDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
            @RequestParam("endDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate) {
        
        byte[] pdfBytes = bassinService.generateBassinStockReport(id, startDate, endDate);
        
        return ResponseEntity
                .ok()
                .header("Content-Disposition", "attachment; filename=rapport-bassin-" + id + ".pdf")
                .body(pdfBytes);
    }

    @GetMapping(value = "/rapport/global", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generateGlobalStockReport(
            @RequestParam("startDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
            @RequestParam("endDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate) {
        
        byte[] pdfBytes = bassinService.generateGlobalStockReport(startDate, endDate);
        
        return ResponseEntity
                .ok()
                .header("Content-Disposition", "attachment; filename=rapport-global-stock.pdf")
                .body(pdfBytes);
    }
    
    @GetMapping(value = "/export-rapport", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> generateStockReport(
        @RequestParam(value = "categorieId", required = false) Long categorieId,
        @RequestParam(value = "showArchived", defaultValue = "true") boolean showArchived) {
        
        byte[] pdfBytes = bassinService.generateStockReport(categorieId, showArchived);
        
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=rapport-stock.pdf")
                .body(pdfBytes);
    }
    

    @PostMapping("/{id}/update-status")
    public ResponseEntity<Bassin> updateBassinStatus(
        @PathVariable Long id,
        @RequestBody Map<String, String> statusUpdate) {
        
        Bassin bassin = bassinService.getBassinById(id);
        if (bassin == null) {
            return ResponseEntity.notFound().build();
        }
        
        String newStatus = statusUpdate.get("statut");
        if (newStatus != null) {
            bassin.setStatut(newStatus);
            bassin = bassinService.updateBassin(bassin);
            return ResponseEntity.ok(bassin);
        }
        
        return ResponseEntity.badRequest().build();
    }

    // Dans votre méthode d'archivage
    @PostMapping("/{id}/archiver")
    public ResponseEntity<Bassin> archiverBassin(@PathVariable Long id) {
        Bassin bassin = bassinService.getBassinById(id);
        if (bassin == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Vérifier que le stock est à 0
        if (bassin.getStock() > 0) {
            return ResponseEntity
                .badRequest()
                .body(null); // ou renvoyer un objet d'erreur personnalisé
        }
        
        bassin.setArchive(true);
        bassin.setStatut("ARCHIVE");
        bassin = bassinService.updateBassin(bassin);
        return ResponseEntity.ok(bassin);
    }
    
    @PostMapping("/{id}/mettre-sur-commande")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Bassin> mettreSurCommande(
            @PathVariable Long id,
            @RequestParam Integer dureeFabricationJours) {
        
        try {
        	
        	
            Bassin bassin = bassinService.mettreSurCommande(id, dureeFabricationJours);
            return ResponseEntity.ok(bassin);
       
        
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().header("X-Error-Message", e.getMessage()).build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().header("X-Error-Message", e.getMessage()).build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().header("X-Error-Message", e.getMessage()).build();
        }
    }
    
    @PutMapping("/{id}/duree-fabrication")
    public ResponseEntity<?> updateDureeFabrication(
        @PathVariable Long id,
        @RequestParam(required = false) Integer duree,
        @RequestParam(required = false) Integer dureeMin,
        @RequestParam(required = false) Integer dureeMax) {
        
        try {
            Bassin bassin;
            if (duree != null) {
                bassin = bassinService.updateDureeFabrication(id, duree);
            } else if (dureeMin != null && dureeMax != null) {
                bassin = bassinService.updateDureeFabrication(id, dureeMin, dureeMax);
            } else {
                // Valeurs par défaut si aucun paramètre fourni
                bassin = bassinService.updateDureeFabrication(id, 3, 15);
            }
            return ResponseEntity.ok(bassin);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    
 // Method to update fabrication duration with exact days
    public Bassin updateDureeFabrication(Long id, Integer duree) {
        Bassin bassin = getBassinById(id);
        if (bassin == null) {
            throw new IllegalArgumentException("Bassin not found");
        }
        
        bassin.setDureeFabricationJours(duree);
        // Set min and max to null when using exact duration
        bassin.setDureeFabricationJoursMin(null);
        bassin.setDureeFabricationJoursMax(null);
        
        return bassinRepository.save(bassin);
    }

    // Method to update fabrication duration with min-max range
    public Bassin updateDureeFabrication(Long id, Integer dureeMin, Integer dureeMax) {
        Bassin bassin = getBassinById(id);
        if (bassin == null) {
            throw new IllegalArgumentException("Bassin not found");
        }
        
        // Validate min <= max
        if (dureeMin > dureeMax) {
            throw new IllegalArgumentException("Minimum duration cannot be greater than maximum duration");
        }
        
        // Set exact duration to null when using range
        bassin.setDureeFabricationJours(null);
        bassin.setDureeFabricationJoursMin(dureeMin);
        bassin.setDureeFabricationJoursMax(dureeMax);
        
        return bassinRepository.save(bassin);
    }
}

