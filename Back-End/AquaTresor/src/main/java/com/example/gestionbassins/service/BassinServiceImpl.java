package com.example.gestionbassins.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.example.gestionbassins.dto.BassinDTO;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.BassinPersonnalise;
import com.example.gestionbassins.entities.Categorie;
import com.example.gestionbassins.entities.ImageBassin;
import com.example.gestionbassins.entities.Notification;
import com.example.gestionbassins.entities.Transaction;
import com.example.gestionbassins.entities.User;
import com.example.gestionbassins.repos.*;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.kernel.pdf.canvas.draw.DashedLine;
import com.itextpdf.kernel.pdf.canvas.draw.ILineDrawer;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.LineSeparator;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.AreaBreakType;
import com.itextpdf.layout.properties.BorderRadius;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;

import jakarta.transaction.Transactional;

@Service
public class BassinServiceImpl implements BassinService {

    @Autowired
    BassinRepository bassinRepository;

    @Autowired
    ImageBassinService imageBassinService;

    @Autowired
    ImageBassinRepository imageBassinRepository;

    @Autowired
    private TransactionRepository transactionRepository;
    
    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private BassinPersonnaliseRepository bassinPersonnaliseRepository;

    @Autowired
    private AccessoireRepository accessoireRepository;
    
    @Autowired
    private UserServiceClient userServiceClient;
    
    @Autowired
    private PdfReportService pdfReportService;
    
    @Autowired
    private NotificationService notificationService;

    // Couleurs pour le design des rapports
    private static final DeviceRgb PRIMARY_COLOR = new DeviceRgb(0, 90, 170);      // Bleu principal
    private static final DeviceRgb SECONDARY_COLOR = new DeviceRgb(70, 130, 180);  // Bleu secondaire
    private static final DeviceRgb ACCENT_COLOR = new DeviceRgb(0, 164, 239);      // Bleu accent
    private static final DeviceRgb WARNING_COLOR = new DeviceRgb(255, 140, 0);     // Orange warning
    private static final DeviceRgb DANGER_COLOR = new DeviceRgb(220, 20, 60);      // Rouge danger
    private static final DeviceRgb SUCCESS_COLOR = new DeviceRgb(0, 128, 0);       // Vert succès
    private static final DeviceRgb LIGHT_BG_COLOR = new DeviceRgb(240, 248, 255);  // Fond léger
    
    @Override
    public Bassin saveBassin(Bassin b) {
        return bassinRepository.save(b);
    }

    @Override
    public Bassin updateBassin(Bassin b) {
        // Récupérer le bassin existant
        Bassin existingBassin = bassinRepository.findByIdWithImages(b.getIdBassin())
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + b.getIdBassin()));

        // Mettre à jour les propriétés du bassin
        existingBassin.setNomBassin(b.getNomBassin());
        existingBassin.setDescription(b.getDescription());
        existingBassin.setPrix(b.getPrix());
        existingBassin.setMateriau(b.getMateriau());
        existingBassin.setCouleur(b.getCouleur());
        existingBassin.setDimensions(b.getDimensions());
        existingBassin.setDisponible(b.isDisponible());
        existingBassin.setStock(b.getStock());
        existingBassin.setCategorie(b.getCategorie());

        // Mise à jour de la liste des images
        if (b.getImagesBassin() != null && !b.getImagesBassin().isEmpty()) {
            // Supprimer les images existantes uniquement si elles ne sont pas dans la
            // nouvelle liste
            existingBassin.getImagesBassin().removeIf(existingImage -> b.getImagesBassin().stream()
                    .noneMatch(newImage -> newImage.getIdImage().equals(existingImage.getIdImage())));

            // Ajouter les nouvelles images
            for (ImageBassin newImage : b.getImagesBassin()) {
                if (newImage.getIdImage() == null) { // Nouvelle image
                    newImage.setBassin(existingBassin);
                    existingBassin.getImagesBassin().add(newImage);
                }
            }
        }

        // Sauvegarder le bassin mis à jour
        return bassinRepository.save(existingBassin);
    }

    @Override
    public void deleteBassin(Bassin b) {
        bassinRepository.delete(b);
    }

    
    @Override
    public void deleteBassinById(Long id) {
        Bassin b = getBassin(id);
        if (b == null) {
            throw new RuntimeException("Bassin not found with ID: " + id);
        }

        // First delete all associated BassinPersonnalise records
        BassinPersonnalise bassinPersonnalise = bassinPersonnaliseRepository.findByBassinId(id);
        if (bassinPersonnalise != null) {
            // Delete associated accessoires first if needed
            if (bassinPersonnalise.getAccessoires() != null && !bassinPersonnalise.getAccessoires().isEmpty()) {
                accessoireRepository.deleteAll(bassinPersonnalise.getAccessoires());
            }
            bassinPersonnaliseRepository.delete(bassinPersonnalise);
        }

        // Then delete image files
        if (b.getImagesBassin() != null && !b.getImagesBassin().isEmpty()) {
            for (ImageBassin image : b.getImagesBassin()) {
                String filePath = "C:/shared/images/" + image.getImagePath();
                try {
                    Path path = Paths.get(filePath);
                    if (Files.exists(path)) {
                        Files.delete(path);
                        System.out.println("Fichier supprimé : " + filePath);
                    }
                } catch (IOException e) {
                    System.err.println("Erreur lors de la suppression du fichier : " + filePath);
                    e.printStackTrace();
                }
            }
        }

        // Delete image records from database
        imageBassinRepository.deleteAll(b.getImagesBassin());
        
        // Finally delete the bassin
        bassinRepository.deleteById(id);
    }

    @Override
    public Bassin getBassin(Long id) {
        return bassinRepository.findById(id).get();
    }

    @Override
    public List<Bassin> getAllBassins() {
        return bassinRepository.findAll();
    }

    @Override
    public List<Bassin> findByNomBassin(String nom) {
        return bassinRepository.findByNomBassin(nom);
    }

    @Override
    public List<Bassin> findByNomBassinContains(String nom) {
        return bassinRepository.findByNomBassinContains(nom);
    }

   
    @Override
    public List<Bassin> findByCategorie(Categorie c) {
        return bassinRepository.findByCategorie(c);
    }

    @Override
    public List<Bassin> findByCategorieIdCategorie(Long id) {
        return bassinRepository.findByCategorieIdCategorie(id);
    }

    @Override
    public List<Bassin> findByOrderByNomBassinAsc() {
        return bassinRepository.findByOrderByNomBassinAsc();
    }

    @Override
    public List<Bassin> trierBassinsNomsPrix() {
        return bassinRepository.trierBassinNomPrix();
    }

    @Override
    public BassinDTO toBassinDTO(Bassin bassin) {
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

        return dto;
    }

    @Override
    public Bassin getBassinById(Long id) {
        return bassinRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé avec l'ID : " + id));
    }

    @Override
    public Bassin updateBassin(Long id, Bassin bassin) {
        Bassin existingBassin = bassinRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
        existingBassin.setNomBassin(bassin.getNomBassin());
        existingBassin.setDescription(bassin.getDescription());
        existingBassin.setPrix(bassin.getPrix());
        existingBassin.setMateriau(bassin.getMateriau());
        existingBassin.setCouleur(bassin.getCouleur());
        existingBassin.setDimensions(bassin.getDimensions());
        existingBassin.setDisponible(bassin.isDisponible());
        existingBassin.setStock(bassin.getStock());
        return bassinRepository.save(existingBassin);
    }


    @Override
    public Bassin desarchiverBassin(Long id, int nouvelleQuantite) {
        Bassin bassin = bassinRepository.findById(id).orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
        bassin.setArchive(false);
        bassin.setStock(nouvelleQuantite);
        return bassinRepository.save(bassin);
    }



@Transactional
public Bassin mettreAJourQuantite(Long id, int quantite, String raison) {
	 Bassin bassin = bassinRepository.findById(id)
	            .orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
	    
	    int nouveauStock = bassin.getStock() + quantite;
	    
	    if (nouveauStock < 0) {
	        throw new IllegalArgumentException("La quantité ne peut pas rendre le stock négatif");
	    }
        
        // Mise à jour du stock
        bassin.setStock(nouveauStock);

        // Gestion automatique du statut SUR_COMMANDE
        if (nouveauStock == 0) {
            bassin.setStatut("SUR_COMMANDE");
            bassin.setSurCommande(true);
            
            // Durée de fabrication par défaut entre 4 et 15 jours
            bassin.setDureeFabricationJoursMin(4);
            bassin.setDureeFabricationJoursMax(15);
            
            // Notification
            Notification notification = new Notification();
            notification.setMessage("⚠️ Le bassin " + bassin.getNomBassin() + 
                    " est maintenant sur commande. Durée de fabrication: " + 
                    bassin.getDureeFabricationDisplay());
            notification.setType("warning");
            notification.setDate(new Date());
            notification.setRead(false);
            notificationRepository.save(notification);
        } else {
            bassin.setStatut("DISPONIBLE");
            bassin.setSurCommande(false);
            bassin.setDureeFabricationJoursMin(null);
            bassin.setDureeFabricationJoursMax(null);
        }
        return bassinRepository.save(bassin);
    }
    
    private Date calculerDateDisponibilite(int jours) {
        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.DAY_OF_YEAR, jours);
        return calendar.getTime();
    }
    
@Transactional
public Bassin updateDureeFabrication(Long id, int dureeMin, int dureeMax) {
    if (dureeMin <= 0 || dureeMax <= 0 || dureeMin > dureeMax) {
        throw new IllegalArgumentException("La durée doit être une fourchette valide (min <= max)");
    }
    
    Bassin bassin = bassinRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
    
    // Autoriser la modification si le bassin est sur commande ou si le stock est à 0
    if (bassin.getStock() == 0 && !"SUR_COMMANDE".equals(bassin.getStatut())) {
        bassin.setStatut("SUR_COMMANDE");
        bassin.setSurCommande(true);
    }
    
    if (!"SUR_COMMANDE".equals(bassin.getStatut())) {
        throw new IllegalStateException("La durée de fabrication ne peut être modifiée que pour les bassins sur commande");
    }
    
    bassin.setDureeFabricationJoursMin(dureeMin);
    bassin.setDureeFabricationJoursMax(dureeMax);
    
    // Notification
    Notification notification = new Notification();
    notification.setMessage("ℹ️ Durée de fabrication mise à jour pour " + bassin.getNomBassin() + 
            ": " + bassin.getDureeFabricationDisplay());
    notification.setType("info");
    notification.setDate(new Date());
    notification.setRead(false);
    notificationRepository.save(notification);
    
    return bassinRepository.save(bassin);
}


    @Override
    public Bassin archiverBassin(Long id) {
        Bassin bassin = bassinRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
        
        // Vérifier que le stock est bien à 0 avant d'archiver
        if (bassin.getStock() != 0) {
            throw new IllegalStateException("Impossible d'archiver un bassin dont le stock n'est pas à 0");
        }
        
        // Mettre à jour le statut et archiver
        bassin.setStatut("ARCHIVE");
        bassin.setArchive(true);
        
        // Créer une notification
        Notification notification = new Notification();
        notification.setMessage("✅ Bassin " + bassin.getNomBassin() + " a été archivé (Rupture définitive)");
        notification.setType("success");
        notification.setDate(new Date());
        notification.setRead(false);
        notificationRepository.save(notification);
        
        return bassinRepository.save(bassin);
    }
    @Override
    public Bassin mettreSurCommande(Long id) {
        Bassin bassin = bassinRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
        
        // Vérifier que le stock est à 0
        if (bassin.getStock() != 0) {
            throw new IllegalStateException("Le bassin doit avoir un stock à 0 pour être mis sur commande");
        }
        
        // Mettre à jour le statut
        bassin.setStatut("SUR_COMMANDE");
        bassin.setArchive(false);
        
        // Créer une notification
        Notification notification = new Notification();
        notification.setMessage("ℹ️ Bassin " + bassin.getNomBassin() + " est maintenant sur commande");
        notification.setType("info");
        notification.setDate(new Date());
        notification.setRead(false);
        notificationRepository.save(notification);
        
        return bassinRepository.save(bassin);
    }
    @Override
    public List<Bassin> getBassinsNonArchives() {
        return bassinRepository.findByArchiveFalse();
    }

    @Override
    public List<Bassin> getBassinsArchives() {
        return bassinRepository.findByArchiveTrue();
    }

    @Override
    public void notifierStockFaible() {
        List<Bassin> bassins = bassinRepository.findByArchiveFalse();
        for (Bassin bassin : bassins) {
            if (bassin.getStock() < 5) {
                // Créer une notification pour chaque bassin avec un stock faible
                Notification notification = new Notification();
                notification.setMessage("⚠️ ALERTE : Stock faible pour le bassin " + bassin.getNomBassin()
                        + " (Quantité : " + bassin.getStock() + ")");
                notification.setType("warning"); // Set notification type
                notification.setDate(new Date());
                notification.setRead(false);
                notificationRepository.save(notification);
            }
        }
    }
    
    @Override
    public List<Transaction> getTransactions() {
        List<Transaction> transactions = transactionRepository.findAll();
        
        // Enrichir les transactions avec les infos utilisateur si disponible
        for (Transaction transaction : transactions) {
            if (transaction.getUserId() != null) {
                try {
                    User user = userServiceClient.getUserByUsername(transaction.getUserId().toString());
                    transaction.setUser(user);
                } catch (Exception e) {
                    // Gérer silencieusement en cas d'échec de récupération
                }
            }
        }
        
        return transactions;
    }
    
    @Override
    public void adjustStock(Long bassinId, int quantityDelta) {
        // Méthode simple pour ajuster le stock sans info supplémentaire
        Bassin bassin = getBassinById(bassinId);
        bassin.setStock(bassin.getStock() + quantityDelta);
        bassinRepository.save(bassin);
    }
    
    @Override
    public Bassin adjustStock(Long bassinId, int quantityDelta, String raison, String typeOperation, String username) {
        Bassin bassin = getBassinById(bassinId);
        int oldStock = bassin.getStock();
        bassin.setStock(oldStock + quantityDelta);
        
        // Création d'une transaction avec plus d'informations
        Transaction transaction = new Transaction();
        transaction.setBassin(bassin);
        transaction.setQuantite(quantityDelta);
        transaction.setRaison(raison);
        transaction.setTypeOperation(typeOperation);
        transaction.setDateTransaction(new Date());
        
        // Si un utilisateur est fourni, on associe la transaction
        if (username != null && !username.isEmpty()) {
            try {
                User user = userServiceClient.getUserByUsername(username);
                if (user != null) {
                    transaction.setUserId(user.getUserId());
                }
            } catch (Exception e) {
                // Gérer silencieusement en cas d'échec
            }
        }
        
        transactionRepository.save(transaction);
        
        // Notification si le stock devient faible
        if (bassin.getStock() < 5 && bassin.getStock() > 0) {
            Notification notification = new Notification();
            notification.setMessage("⚠️ Stock faible: " + bassin.getNomBassin() + " - " + bassin.getStock() + " unité(s)");
            notification.setType("warning");
            notification.setDate(new Date());
            notification.setRead(false);
            notificationService.createNotification(notification);
        } else if (bassin.getStock() == 0) {
            Notification notification = new Notification();
            notification.setMessage("🚫 RUPTURE DE STOCK: " + bassin.getNomBassin());
            notification.setType("danger");
            notification.setDate(new Date());
            notification.setRead(false);
            notificationService.createNotification(notification);
        }
        
        return bassinRepository.save(bassin);
    }
    
    @Override
    public List<Transaction> getBassinTransactions(Long bassinId) {
        return transactionRepository.findByBassin_IdBassinOrderByDateTransactionDesc(bassinId);
    }

    
    @Override
public byte[] generateStockReport(Long categorieId, boolean showArchived) {
    try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
        PdfWriter writer = new PdfWriter(baos);
        writer.setCompressionLevel(9);
        
        PdfDocument pdfDoc = new PdfDocument(writer);
        pdfDoc.setDefaultPageSize(PageSize.A4.rotate());
        
        Document document = new Document(pdfDoc);
        document.setMargins(36, 36, 36, 36);
        
        // Ajouter les contenus
        addReportHeader(document, "RAPPORT DE STOCK COMPLET", showArchived ? "(Inclut les bassins archivés)" : "(Bassins actifs seulement)");
        Map<Categorie, List<Bassin>> bassinsParCategorie = organizeBassinsByCategory(categorieId, showArchived);
        addGlobalStatistics(document, bassinsParCategorie);
        addDetailedInventory(document, showArchived);
        addFooter(document);
        
        document.getRenderer().flush();
        document.close();
        
        return baos.toByteArray();
    } catch (Exception e) {
        throw new RuntimeException("Erreur lors de la génération du rapport: " + e.getMessage(), e);
    }
}
@Override
public byte[] generateGlobalStockReport(Date startDate, Date endDate) {
    try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
        PdfWriter writer = new PdfWriter(baos);
        writer.setCompressionLevel(9);
        
        PdfDocument pdfDoc = new PdfDocument(writer);
        pdfDoc.setDefaultPageSize(PageSize.A4.rotate());
        
        Document document = new Document(pdfDoc);
        document.setMargins(36, 36, 36, 36);
        
        addReportHeader(document, "RAPPORT GLOBAL DE STOCK", 
                "Période: " + formatDateShort(startDate) + " à " + formatDateShort(endDate));
        addGlobalSummary(document, startDate, endDate);
        addDetailedInventory(document, true); // Toujours inclure les archivés dans le rapport global
        addTransactionSummary(document, startDate, endDate);
        addUserActivitySummary(document, startDate, endDate);
        addFooter(document);
        
        document.getRenderer().flush();
        document.close();
        
        return baos.toByteArray();
    } catch (Exception e) {
        throw new RuntimeException("Erreur lors de la génération du rapport global: " + e.getMessage(), e);
    }
}
    @Override
    public byte[] generateBassinStockReport(Long bassinId, Date startDate, Date endDate) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            writer.setCompressionLevel(9); // Compression maximale pour réduire la taille
            
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc);
            document.setMargins(36, 36, 36, 36); // Marges plus propres
            
            Bassin bassin = bassinRepository.findById(bassinId)
                .orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
            
            addReportHeader(document, "RAPPORT DE STOCK - " + bassin.getNomBassin().toUpperCase(), 
                    "Période: " + formatDateShort(startDate) + " à " + formatDateShort(endDate));
            addBassinDetails(document, bassin);
            addTransactionHistory(document, bassinId, startDate, endDate);
            addUserSummary(document, bassinId, startDate, endDate);
            addFooter(document);
            
            // Optimisation
            document.getRenderer().flush();
            document.close();
            
            return baos.toByteArray();
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de la génération du rapport bassin: " + e.getMessage(), e);
        }
    }

    
    private void addReportHeader(Document document, String title, String subtitle) {
        try {
            // Table pour l'en-tête avec logo et informations
            Table headerTable = new Table(UnitValue.createPercentArray(new float[]{1, 3}))
                    .setWidth(UnitValue.createPercentValue(100));
            
            // Logo de l'entreprise
            try {
                // Utiliser un chemin absolu pour éviter les problèmes de chargement
                Path logoPath = Paths.get("C:/shared/icone_rapport_stock/icon.jpg");
                if (Files.exists(logoPath)) {
                    Image logo = new Image(ImageDataFactory.create(logoPath.toAbsolutePath().toString()))
                        .setWidth(70)
                        .setHorizontalAlignment(HorizontalAlignment.LEFT);
                    headerTable.addCell(new Cell().add(logo).setBorder(Border.NO_BORDER));
                } else {
                    Cell placeholderCell = new Cell()
                        .add(new Paragraph("AquaTrésor").setFontSize(20).setBold().setFontColor(PRIMARY_COLOR))
                        .setBorder(Border.NO_BORDER);
                    headerTable.addCell(placeholderCell);
                }
            } catch (Exception e) {
                // Fallback en cas de problème avec l'image
                Cell placeholderCell = new Cell()
                    .add(new Paragraph("AquaTrésor").setFontSize(20).setBold().setFontColor(PRIMARY_COLOR))
                    .setBorder(Border.NO_BORDER);
                headerTable.addCell(placeholderCell);
            }
            
            // Informations d'en-tête
            Cell infoCell = new Cell()
                .setTextAlignment(TextAlignment.RIGHT)
                .setBorder(Border.NO_BORDER)
                .add(new Paragraph("AquaTrésor")
                    .setFontSize(18)
                    .setBold()
                    .setFontColor(PRIMARY_COLOR))
                .add(new Paragraph(title)
                    .setFontSize(16)
                    .setBold())
                .add(new Paragraph("Généré le: " + LocalDateTime.now().format(
                    DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm:ss"))));
            
            if (subtitle != null) {
                infoCell.add(new Paragraph(subtitle).setItalic());
            }
            
            infoCell.add(new Paragraph("Système de gestion des bassins"));
            
            headerTable.addCell(infoCell);
            document.add(headerTable);
            
            // Ligne de séparation élégante
            ILineDrawer line = new SolidLine(1.5f);
            ((SolidLine)line).setColor(PRIMARY_COLOR);
            document.add(new LineSeparator(line).setMarginTop(10).setMarginBottom(15));
            
        } catch (Exception e) {
            e.printStackTrace();
            // Ajouter un en-tête simple en cas d'erreur
            document.add(new Paragraph(title).setBold().setFontSize(16));
        }
    }

private Map<Categorie, List<Bassin>> organizeBassinsByCategory(Long categorieId, boolean showArchived) {
    List<Bassin> bassins = showArchived ? 
        bassinRepository.findAll() : // Inclut tous les bassins (archivés et non archivés)
        bassinRepository.findByArchiveFalse(); // Seulement les non archivés
    
    Stream<Bassin> bassinStream = bassins.stream();
    
    if (categorieId != null) {
        bassinStream = bassinStream.filter(b -> 
            b.getCategorie() != null && 
            b.getCategorie().getIdCategorie().equals(categorieId));
    }
    
    return bassinStream.collect(Collectors.groupingBy(
        Bassin::getCategorie,
        Collectors.toList()
    ));
}

private void addGlobalStatistics(Document document, Map<Categorie, List<Bassin>> bassinsParCategorie) {
    long totalBassins = bassinsParCategorie.values().stream().mapToLong(List::size).sum();
    long archived = bassinsParCategorie.values().stream()
        .flatMap(List::stream)
        .filter(Bassin::isArchive)
        .count();
    long active = totalBassins - archived;
    long lowStock = bassinsParCategorie.values().stream()
        .flatMap(List::stream)
        .filter(b -> !b.isArchive() && b.getStock() < 5 && b.getStock() > 0)
        .count();
    long outOfStock = bassinsParCategorie.values().stream()
        .flatMap(List::stream)
        .filter(b -> !b.isArchive() && b.getStock() == 0)
        .count();
    double totalValue = bassinsParCategorie.values().stream()
        .flatMap(List::stream)
        .filter(b -> !b.isArchive())
        .mapToDouble(b -> b.getPrix() * b.getStock())
        .sum();
    double archivedValue = bassinsParCategorie.values().stream()
        .flatMap(List::stream)
        .filter(Bassin::isArchive)
        .mapToDouble(b -> b.getPrix() * b.getStock())
        .sum();
    
    // Section de statistiques avec un design amélioré
    document.add(new Paragraph("STATISTIQUES GLOBALES")
        .setFontSize(14)
        .setBold()
        .setFontColor(PRIMARY_COLOR)
        .setMarginBottom(10));
    
    // Utilisation de cartes pour les statistiques principales
    Table statsCards = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 1}))
        .setWidth(UnitValue.createPercentValue(100))
        .setMarginBottom(20);
    
    addStatCard(statsCards, "Catégories", String.valueOf(bassinsParCategorie.size()));
    addStatCard(statsCards, "Bassins Actifs", String.valueOf(active), SUCCESS_COLOR);
    addStatCard(statsCards, "Bassins Archivés", String.valueOf(archived), DANGER_COLOR);
    addStatCard(statsCards, "Valeur Active", String.format("%,.2f DT", totalValue));
    
    document.add(statsCards);
    
    // Table détaillée des statistiques
    Table statsTable = new Table(UnitValue.createPercentArray(new float[]{2, 3}))
        .setWidth(UnitValue.createPercentValue(100))
        .setMarginBottom(20);
    
    statsTable.addHeaderCell(new Cell(1, 2)
        .add(new Paragraph("DÉTAILS DU STOCK"))
        .setBackgroundColor(SECONDARY_COLOR)
        .setFontColor(ColorConstants.WHITE)
        .setTextAlignment(TextAlignment.CENTER));
    
    addStatRow(statsTable, "Total bassins", String.valueOf(totalBassins), LIGHT_BG_COLOR);
    addStatRow(statsTable, "Bassins actifs", String.valueOf(active), LIGHT_BG_COLOR);
    addStatRow(statsTable, "Bassins archivés", String.valueOf(archived), LIGHT_BG_COLOR);
    addStatRow(statsTable, "Stock faible (1-4)", String.valueOf(lowStock), LIGHT_BG_COLOR);
    addStatRow(statsTable, "Rupture de stock", String.valueOf(outOfStock), LIGHT_BG_COLOR);
    addStatRow(statsTable, "Valeur active", String.format("%,.2f DT", totalValue), LIGHT_BG_COLOR);
    addStatRow(statsTable, "Valeur archivée", String.format("%,.2f DT", archivedValue), LIGHT_BG_COLOR);
    
    document.add(statsTable);
}

    private void addStatCard(Table table, String label, String value) {
        addStatCard(table, label, value, null);
    }
    
    private void addStatRow(Table table, String label, String value, DeviceRgb bgColor) {
        Cell labelCell = new Cell()
            .add(new Paragraph(label))
            .setPadding(5)
            .setBackgroundColor(bgColor);
            
        Cell valueCell = new Cell()
            .add(new Paragraph(value))
            .setPadding(5)
            .setBackgroundColor(bgColor);
            
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addCategoryDetails(Document document, Map<Categorie, List<Bassin>> bassinsParCategorie) {
        document.add(new Paragraph("INVENTAIRE PAR CATÉGORIE")
            .setFontSize(14)
            .setBold()
            .setFontColor(PRIMARY_COLOR)
            .setMarginTop(10)
            .setMarginBottom(10));
        
        bassinsParCategorie.forEach((categorie, bassins) -> {
            if (categorie != null) {
                document.add(new Paragraph(categorie.getNomCategorie())
                    .setFontSize(12)
                    .setBold()
                    .setFontColor(SECONDARY_COLOR)
                    .setMarginTop(5));
                
                Table categoryTable = new Table(UnitValue.createPercentArray(new float[]{3, 1, 1, 1, 1, 1, 1}))
                    .setWidth(UnitValue.createPercentValue(100));
                
                // En-têtes
                Stream.of("Nom du bassin", "Prix", "Stock", "Valeur", "Matériau", "Couleur", "Statut")
                    .forEach(columnTitle -> {
                        Cell header = new Cell()
                            .add(new Paragraph(columnTitle).setBold())
                            .setBackgroundColor(LIGHT_BG_COLOR)
                            .setTextAlignment(TextAlignment.CENTER);
                        categoryTable.addHeaderCell(header);
                    });
                
                // Données
                boolean alternate = false;
                for (Bassin bassin : bassins) {
                    DeviceRgb rowColor = alternate ? LIGHT_BG_COLOR : (DeviceRgb) ColorConstants.WHITE;
                    alternate = !alternate;
                    
                    categoryTable.addCell(new Cell()
                        .add(new Paragraph(bassin.getNomBassin()))
                        .setBackgroundColor(rowColor));
                    
                    categoryTable.addCell(new Cell()
                        .add(new Paragraph(String.format("%,.2f DT", bassin.getPrix())))
                        .setTextAlignment(TextAlignment.RIGHT)
                        .setBackgroundColor(rowColor));
                    
                    // Cellule stock avec couleur selon niveau
                    Cell stockCell = new Cell()
                        .add(new Paragraph(String.valueOf(bassin.getStock())))
                        .setTextAlignment(TextAlignment.CENTER)
                        .setBackgroundColor(rowColor);
                    
                    if (bassin.getStock() == 0) {
                        stockCell.setFontColor(DANGER_COLOR);
                    } else if (bassin.getStock() < 5) {
                        stockCell.setFontColor(WARNING_COLOR);
                    }
                    categoryTable.addCell(stockCell);
                    
                    categoryTable.addCell(new Cell()
                        .add(new Paragraph(String.format("%,.2f DT", bassin.getPrix() * bassin.getStock())))
                        .setTextAlignment(TextAlignment.RIGHT)
                        .setBackgroundColor(rowColor));
                    
                    categoryTable.addCell(new Cell()
                        .add(new Paragraph(bassin.getMateriau() != null ? bassin.getMateriau() : "-"))
                        .setBackgroundColor(rowColor));
                    
                    categoryTable.addCell(new Cell()
                        .add(new Paragraph(bassin.getCouleur() != null ? bassin.getCouleur() : "-"))
                        .setBackgroundColor(rowColor));
                    
                    String status = bassin.isArchive() ? "Archivé" : (bassin.isDisponible() ? "Disponible" : "Non disponible");
                    Cell statusCell = new Cell()
                        .add(new Paragraph(status))
                        .setTextAlignment(TextAlignment.CENTER)
                        .setBackgroundColor(rowColor);
                    
                    if (bassin.isArchive()) {
                        statusCell.setFontColor(DANGER_COLOR);
                    } else if (!bassin.isDisponible()) {
                        statusCell.setFontColor(WARNING_COLOR);
                    }
                    
                    categoryTable.addCell(statusCell);
                }
                
                document.add(categoryTable);
                document.add(new Paragraph("")
                    .setMarginBottom(10));
            }
        });
    }

    private void addFooter(Document document) {
        // Ligne de séparation 
        ILineDrawer line = new DashedLine(1f);
        ((DashedLine)line).setColor(SECONDARY_COLOR);
        document.add(new LineSeparator(line).setMarginTop(15).setMarginBottom(10));
        
        Table footerTable = new Table(1)
            .setWidth(UnitValue.createPercentValue(100));
        
        footerTable.addCell(new Cell()
            .add(new Paragraph("SYSTÈME DE GESTION DES BASSINS AQUATRÉSOR")
                .setFontSize(8)
                .setTextAlignment(TextAlignment.CENTER))
            .add(new Paragraph("Document confidentiel - Usage interne uniquement")
                .setFontSize(8)
                .setItalic()
                .setTextAlignment(TextAlignment.CENTER))
            .setBorder(Border.NO_BORDER));
            
        document.add(footerTable);
    }

    private String formatDateShort(Date date) {
        if (date == null) return "N/A";
        return LocalDate.ofInstant(date.toInstant(), ZoneId.systemDefault())
            .format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private void addBassinDetails(Document document, Bassin bassin) {
        document.add(new Paragraph("DÉTAILS DU BASSIN")
            .setFontSize(14)
            .setBold()
            .setFontColor(PRIMARY_COLOR)
            .setMarginTop(10)
            .setMarginBottom(10));
        
        // Informations générales du bassin
        Table infoTable = new Table(UnitValue.createPercentArray(new float[]{1, 2}))
            .setWidth(UnitValue.createPercentValue(100));
        
        // Ajouter image principale si disponible
        if (bassin.getImagesBassin() != null && !bassin.getImagesBassin().isEmpty()) {
            try {
                ImageBassin mainImage = bassin.getImagesBassin().get(0);
                String imagePath = "C:/shared/images/" + mainImage.getImagePath();
                Path path = Paths.get(imagePath);
                
                if (Files.exists(path)) {
                    Image img = new Image(ImageDataFactory.create(imagePath))
                        .setWidth(150)
                        .setHeight(150);
                    
                    Cell imgCell = new Cell(8, 1)
                        .add(img)
                        .setVerticalAlignment(VerticalAlignment.MIDDLE)
                        .setBorder(Border.NO_BORDER);
                    
                    infoTable.addCell(imgCell);
                } else {
                    infoTable.addCell(new Cell(8, 1)
                        .add(new Paragraph("Image non disponible"))
                        .setBorder(Border.NO_BORDER)
                        .setVerticalAlignment(VerticalAlignment.MIDDLE));
                }
            } catch (Exception e) {
                infoTable.addCell(new Cell(8, 1)
                    .add(new Paragraph("Image non disponible"))
                    .setBorder(Border.NO_BORDER)
                    .setVerticalAlignment(VerticalAlignment.MIDDLE));
            }
        } else {
            infoTable.addCell(new Cell(8, 1)
                .add(new Paragraph("Aucune image"))
                .setBorder(Border.NO_BORDER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE));
        }
        
        // Informations textuelles
        Table detailsTable = new Table(UnitValue.createPercentArray(new float[]{1, 2}))
            .setWidth(UnitValue.createPercentValue(100));
        
        addDetailRow(detailsTable, "ID", bassin.getIdBassin().toString());
        addDetailRow(detailsTable, "Nom", bassin.getNomBassin());
        addDetailRow(detailsTable, "Catégorie", bassin.getCategorie() != null ? bassin.getCategorie().getNomCategorie() : "Non catégorisé");
        addDetailRow(detailsTable, "Prix unitaire", String.format("%,.2f DT", bassin.getPrix()));
        addDetailRow(detailsTable, "Stock actuel", String.valueOf(bassin.getStock()));
        addDetailRow(detailsTable, "Valeur totale", String.format("%,.2f DT", bassin.getPrix() * bassin.getStock()));
        addDetailRow(detailsTable, "Statut", bassin.isArchive() ? "Archivé" : (bassin.isDisponible() ? "Disponible" : "Non disponible"));
        
        Cell detailsCell = new Cell()
            .add(detailsTable)
            .setBorder(Border.NO_BORDER);
        
        infoTable.addCell(detailsCell);
        document.add(infoTable);
        
        // Caractéristiques techniques
        document.add(new Paragraph("CARACTÉRISTIQUES TECHNIQUES")
            .setFontSize(12)
            .setBold()
            .setFontColor(SECONDARY_COLOR)
            .setMarginTop(15)
            .setMarginBottom(5));
        
        Table techTable = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 1}))
            .setWidth(UnitValue.createPercentValue(100));
        
        techTable.addCell(createFeatureCell("Matériau", bassin.getMateriau() != null ? bassin.getMateriau() : "Non spécifié"));
        techTable.addCell(createFeatureCell("Couleur", bassin.getCouleur() != null ? bassin.getCouleur() : "Non spécifié"));
        techTable.addCell(createFeatureCell("Dimensions", bassin.getDimensions() != null ? bassin.getDimensions() : "Non spécifié"));
        techTable.addCell(createFeatureCell("Archivé", bassin.isArchive() ? "Oui" : "Non"));
        
        document.add(techTable);
        
        // Description
        if (bassin.getDescription() != null && !bassin.getDescription().isEmpty()) {
            document.add(new Paragraph("DESCRIPTION")
                .setFontSize(12)
                .setBold()
                .setFontColor(SECONDARY_COLOR)
                .setMarginTop(15)
                .setMarginBottom(5));
            
            document.add(new Paragraph(bassin.getDescription())
                .setMarginBottom(15));
        }
    }
    
    private Cell createFeatureCell(String label, String value) {
        Cell cell = new Cell()
            .setPadding(10)
            .setBackgroundColor(LIGHT_BG_COLOR);
            
        cell.add(new Paragraph(label)
            .setFontSize(10)
            .setBold());
            
        cell.add(new Paragraph(value)
            .setFontSize(12));
            
        return cell;
    }
    
    private void addDetailRow(Table table, String label, String value) {
        DeviceRgb bgColor = (DeviceRgb) ColorConstants.WHITE;
        DeviceRgb textColor = (DeviceRgb) ColorConstants.BLACK;
        
        // Cas spéciaux pour certaines valeurs
        if (label.equals("Stock actuel")) {
            try {
                int stock = Integer.parseInt(value);
                if (stock == 0) {
                    textColor = DANGER_COLOR;
                } else if (stock < 5) {
                    textColor = WARNING_COLOR;
                }
            } catch (NumberFormatException e) {
                // Ignorer si la valeur n'est pas un nombre
            }
        }
        
        Cell labelCell = new Cell()
            .add(new Paragraph(label).setBold())
            .setPadding(5)
            .setBackgroundColor(bgColor);
            
        Cell valueCell = new Cell()
            .add(new Paragraph(value).setFontColor(textColor))
            .setPadding(5)
            .setBackgroundColor(bgColor);
            
        table.addCell(labelCell);
        table.addCell(valueCell);
    }
    
    private void addTransactionHistory(Document document, Long bassinId, Date startDate, Date endDate) {
        document.add(new Paragraph("HISTORIQUE DES TRANSACTIONS")
            .setFontSize(14)
            .setBold()
            .setFontColor(PRIMARY_COLOR)
            .setMarginTop(15)
            .setMarginBottom(10));
            
        // Récupérer les transactions
        List<Transaction> transactions = transactionRepository.findByBassin_IdBassinOrderByDateTransactionDesc(bassinId);
        
        // Filtrer par date si nécessaire
        if (startDate != null || endDate != null) {
            LocalDateTime startLocalDate = startDate != null ? 
                startDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime() : 
                LocalDateTime.of(1970, 1, 1, 0, 0);
                
            LocalDateTime endLocalDate = endDate != null ? 
                endDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime().plusDays(1) : 
                LocalDateTime.now().plusDays(1);
                
            transactions = transactions.stream()
                .filter(t -> {
                    LocalDateTime transDate = t.getDateTransaction().toInstant()
                        .atZone(ZoneId.systemDefault()).toLocalDateTime();
                    return !transDate.isBefore(startLocalDate) && !transDate.isAfter(endLocalDate);
                })
                .collect(Collectors.toList());
        }
        
        if (transactions.isEmpty()) {
            document.add(new Paragraph("Aucune transaction trouvée pour la période sélectionnée.")
                .setItalic()
                .setFontColor(SECONDARY_COLOR));
            return;
        }
        
        // Tableau des transactions
        Table transTable = new Table(UnitValue.createPercentArray(new float[]{1, 2, 1, 1, 2, 2}))
            .setWidth(UnitValue.createPercentValue(100));
            
        // En-têtes
        Stream.of("Date", "Type", "Quantité", "Utilisateur", "Raison", "Commentaires")
            .forEach(columnTitle -> {
                Cell header = new Cell()
                    .add(new Paragraph(columnTitle).setBold())
                    .setBackgroundColor(SECONDARY_COLOR)
                    .setFontColor(ColorConstants.WHITE)
                    .setTextAlignment(TextAlignment.CENTER);
                transTable.addHeaderCell(header);
            });
            
        // Données
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        
        boolean alternate = false;
        for (Transaction t : transactions) {
            DeviceRgb rowColor = alternate ? LIGHT_BG_COLOR : (DeviceRgb) ColorConstants.WHITE;
            alternate = !alternate;
            
            // Date
            LocalDateTime dateTime = t.getDateTransaction().toInstant()
                .atZone(ZoneId.systemDefault()).toLocalDateTime();
                
            transTable.addCell(new Cell()
                .add(new Paragraph(dateTime.format(formatter)))
                .setBackgroundColor(rowColor));
                
            // Type d'opération
            String type = t.getTypeOperation() != null ? t.getTypeOperation() : "Ajustement";
            DeviceRgb typeColor = (DeviceRgb) ColorConstants.BLACK;
            
            if ("ENTRÉE".equalsIgnoreCase(type)) {
                typeColor = SUCCESS_COLOR;
            } else if ("SORTIE".equalsIgnoreCase(type)) {
                typeColor = DANGER_COLOR;
            } else if ("AJUSTEMENT".equalsIgnoreCase(type)) {
                typeColor = WARNING_COLOR;
            }
            
            transTable.addCell(new Cell()
                .add(new Paragraph(type).setFontColor(typeColor))
                .setBackgroundColor(rowColor)
                .setTextAlignment(TextAlignment.CENTER));
                
            // Quantité
            int quantite = t.getQuantite();
            DeviceRgb quantiteColor = quantite >= 0 ? SUCCESS_COLOR : DANGER_COLOR;
            
            transTable.addCell(new Cell()
                .add(new Paragraph(String.valueOf(quantite)).setFontColor(quantiteColor))
                .setBackgroundColor(rowColor)
                .setTextAlignment(TextAlignment.CENTER));
                
            // Utilisateur
            String username = "Système";
            if (t.getUserId() != null) {
                try {
                    User user = userServiceClient.getUserByUsername(t.getUserId().toString());
                    if (user != null) {
                        username = user.getUsername();
                    }
                } catch (Exception e) {
                    // Ignorer en cas d'erreur de récupération
                }
            }
            
            transTable.addCell(new Cell()
                .add(new Paragraph(username))
                .setBackgroundColor(rowColor));
                
            // Raison
            transTable.addCell(new Cell()
                .add(new Paragraph(t.getRaison() != null ? t.getRaison() : "-"))
                .setBackgroundColor(rowColor));
                
            // Commentaires / champ vide pour extension future
            transTable.addCell(new Cell()
                .add(new Paragraph("-"))
                .setBackgroundColor(rowColor));
        }
        
        document.add(transTable);
        
        // Résumé des transactions
        int totalIn = transactions.stream()
            .filter(t -> t.getQuantite() > 0)
            .mapToInt(Transaction::getQuantite)
            .sum();
            
        int totalOut = transactions.stream()
            .filter(t -> t.getQuantite() < 0)
            .mapToInt(Transaction::getQuantite)
            .sum();
            
        document.add(new Paragraph(String.format(
            "Résumé: %d entrées (+%d), %d sorties (%d), Net: %d",
            transactions.stream().filter(t -> t.getQuantite() > 0).count(),
            totalIn,
            transactions.stream().filter(t -> t.getQuantite() < 0).count(),
            totalOut,
            totalIn + totalOut
        ))
        .setMarginTop(10)
        .setItalic());
    }
    
    private void addUserSummary(Document document, Long bassinId, Date startDate, Date endDate) {
        document.add(new Paragraph("ACTIVITÉ PAR UTILISATEUR")
            .setFontSize(14)
            .setBold()
            .setFontColor(PRIMARY_COLOR)
            .setMarginTop(15)
            .setMarginBottom(10));
            
        // Récupérer les transactions
        List<Transaction> transactions = transactionRepository.findByBassin_IdBassinOrderByDateTransactionDesc(bassinId);
        
        // Filtrer par date si nécessaire
        if (startDate != null || endDate != null) {
            LocalDateTime startLocalDate = startDate != null ? 
                startDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime() : 
                LocalDateTime.of(1970, 1, 1, 0, 0);
                
            LocalDateTime endLocalDate = endDate != null ? 
                endDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime().plusDays(1) : 
                LocalDateTime.now().plusDays(1);
                
            transactions = transactions.stream()
                .filter(t -> {
                    LocalDateTime transDate = t.getDateTransaction().toInstant()
                        .atZone(ZoneId.systemDefault()).toLocalDateTime();
                    return !transDate.isBefore(startLocalDate) && !transDate.isAfter(endLocalDate);
                })
                .collect(Collectors.toList());
        }
        
        if (transactions.isEmpty()) {
            document.add(new Paragraph("Aucune transaction à analyser.")
                .setItalic()
                .setFontColor(SECONDARY_COLOR));
            return;
        }
        
        // Grouper par utilisateur
        Map<String, List<Transaction>> transactionsByUser = new HashMap<>();
        
        for (Transaction t : transactions) {
            String userId = t.getUserId() != null ? t.getUserId().toString() : "Système";
            String username = "Système";
            
            if (!"Système".equals(userId)) {
                try {
                    User user = userServiceClient.getUserByUsername(userId);
                    if (user != null) {
                        username = user.getUsername();
                    }
                } catch (Exception e) {
                    // Ignorer en cas d'erreur de récupération
                }
            }
            
            transactionsByUser.computeIfAbsent(username, k -> new java.util.ArrayList<>()).add(t);
        }
        
        // Tableau des statistiques par utilisateur
        Table userTable = new Table(UnitValue.createPercentArray(new float[]{2, 1, 1, 1, 1}))
            .setWidth(UnitValue.createPercentValue(100));
            
        // En-têtes
        Stream.of("Utilisateur", "Total transactions", "Entrées", "Sorties", "Impact net")
            .forEach(columnTitle -> {
                Cell header = new Cell()
                    .add(new Paragraph(columnTitle).setBold())
                    .setBackgroundColor(SECONDARY_COLOR)
                    .setFontColor(ColorConstants.WHITE)
                    .setTextAlignment(TextAlignment.CENTER);
                userTable.addHeaderCell(header);
            });
            
        // Données
        boolean alternate = false;
        for (Map.Entry<String, List<Transaction>> entry : transactionsByUser.entrySet()) {
            DeviceRgb rowColor = alternate ? LIGHT_BG_COLOR : (DeviceRgb) ColorConstants.WHITE;
            alternate = !alternate;
            
            String username = entry.getKey();
            List<Transaction> userTransactions = entry.getValue();
            
            int entrees = userTransactions.stream()
                .filter(t -> t.getQuantite() > 0)
                .mapToInt(Transaction::getQuantite)
                .sum();
                
            int sorties = userTransactions.stream()
                .filter(t -> t.getQuantite() < 0)
                .mapToInt(Transaction::getQuantite)
                .sum();
                
            int netImpact = entrees + sorties;
            
            userTable.addCell(new Cell().add(new Paragraph(username)).setBackgroundColor(rowColor));
            userTable.addCell(new Cell().add(new Paragraph(String.valueOf(userTransactions.size()))).setTextAlignment(TextAlignment.CENTER).setBackgroundColor(rowColor));
            userTable.addCell(new Cell().add(new Paragraph("+" + entrees).setFontColor(SUCCESS_COLOR)).setTextAlignment(TextAlignment.CENTER).setBackgroundColor(rowColor));
            userTable.addCell(new Cell().add(new Paragraph(String.valueOf(sorties)).setFontColor(DANGER_COLOR)).setTextAlignment(TextAlignment.CENTER).setBackgroundColor(rowColor));
            
            Paragraph impactParagraph = new Paragraph(String.valueOf(netImpact));
            if (netImpact > 0) {
                impactParagraph.setFontColor(SUCCESS_COLOR);
            } else if (netImpact < 0) {
                impactParagraph.setFontColor(DANGER_COLOR);
            }
            
            userTable.addCell(new Cell().add(impactParagraph).setTextAlignment(TextAlignment.CENTER).setBackgroundColor(rowColor));
        }
        
        document.add(userTable);
    }
    
    private void addGlobalSummary(Document document, Date startDate, Date endDate) {
        document.add(new Paragraph("RÉSUMÉ DE L'INVENTAIRE")
            .setFontSize(14)
            .setBold()
            .setFontColor(PRIMARY_COLOR)
            .setMarginTop(10)
            .setMarginBottom(10));
            
        // Statistiques globales
        List<Bassin> allBassins = bassinRepository.findAll();
        long totalBassins = allBassins.size();
        long activeBassins = allBassins.stream().filter(b -> !b.isArchive()).count();
        long archivedBassins = allBassins.stream().filter(Bassin::isArchive).count();
        
        // Statistiques de stock
        long lowStock = allBassins.stream()
            .filter(b -> !b.isArchive() && b.getStock() < 5 && b.getStock() > 0)
            .count();
            
        long outOfStock = allBassins.stream()
            .filter(b -> !b.isArchive() && b.getStock() == 0)
            .count();
            
        // Valeur du stock
        double totalValue = allBassins.stream()
            .filter(b -> !b.isArchive())
            .mapToDouble(b -> b.getPrix() * b.getStock())
            .sum();
            
        // Transactions pour la période
        List<Transaction> transactions = transactionRepository.findAll();
        
        if (startDate != null || endDate != null) {
            LocalDateTime startLocalDate = startDate != null ? 
                startDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime() : 
                LocalDateTime.of(1970, 1, 1, 0, 0);
                
            LocalDateTime endLocalDate = endDate != null ? 
                endDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime().plusDays(1) : 
                LocalDateTime.now().plusDays(1);
                
            transactions = transactions.stream()
                .filter(t -> {
                    LocalDateTime transDate = t.getDateTransaction().toInstant()
                        .atZone(ZoneId.systemDefault()).toLocalDateTime();
                    return !transDate.isBefore(startLocalDate) && !transDate.isAfter(endLocalDate);
                })
                .collect(Collectors.toList());
        }
        
        int periodEntries = transactions.stream()
            .filter(t -> t.getQuantite() > 0)
            .mapToInt(Transaction::getQuantite)
            .sum();
            
        int periodExits = transactions.stream()
            .filter(t -> t.getQuantite() < 0)
            .mapToInt(Transaction::getQuantite)
            .sum();
            
        // Table pour les statistiques
        Table statsTable = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 1}))
            .setWidth(UnitValue.createPercentValue(100));
            
        addStatsCard(statsTable, "Total Bassins", String.valueOf(totalBassins), null);
        addStatsCard(statsTable, "Bassins Actifs", String.valueOf(activeBassins), SUCCESS_COLOR);
        addStatsCard(statsTable, "Stock Faible", String.valueOf(lowStock), WARNING_COLOR);
        addStatsCard(statsTable, "Rupture Stock", String.valueOf(outOfStock), DANGER_COLOR);
        
        document.add(statsTable);
        
        // Deuxième ligne de statistiques
        Table statsTable2 = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 1}))
            .setWidth(UnitValue.createPercentValue(100));
            
        addStatsCard(statsTable2, "Valeur Totale", String.format("%,.2f DT", totalValue), PRIMARY_COLOR);
        addStatsCard(statsTable2, "Entrées Période", "+" + periodEntries, SUCCESS_COLOR);
        addStatsCard(statsTable2, "Sorties Période", String.valueOf(periodExits), DANGER_COLOR);
        addStatsCard(statsTable2, "Impact Net", String.valueOf(periodEntries + periodExits), 
            (periodEntries + periodExits) > 0 ? SUCCESS_COLOR : DANGER_COLOR);
            
        document.add(statsTable2);
        
        // Période du rapport
        document.add(new Paragraph("Période analysée: " + 
            formatDateShort(startDate) + " au " + formatDateShort(endDate))
            .setItalic()
            .setTextAlignment(TextAlignment.CENTER)
            .setMarginTop(10));
    }
    
    private void addStatsCard(Table table, String title, String value, DeviceRgb valueColor) {
        Cell card = new Cell()
            .setPadding(10)
            .setMargin(5)
            .setBackgroundColor(LIGHT_BG_COLOR);
            
        card.add(new Paragraph(title)
            .setFontSize(10)
            .setTextAlignment(TextAlignment.CENTER));
            
        Paragraph valuePara = new Paragraph(value)
            .setFontSize(16)
            .setBold()
            .setTextAlignment(TextAlignment.CENTER);
            
        if (valueColor != null) {
            valuePara.setFontColor(valueColor);
        }
        
        card.add(valuePara);
        table.addCell(card);
    }
    
private void addDetailedInventory(Document document, boolean showArchived) {
    document.add(new Paragraph("INVENTAIRE DÉTAILLÉ PAR CATÉGORIE")
        .setFontSize(14)
        .setBold()
        .setFontColor(PRIMARY_COLOR)
        .setMarginTop(15)
        .setMarginBottom(10));
        
    // Organisation par catégorie
    Map<Categorie, List<Bassin>> bassinsParCategorie = organizeBassinsByCategory(null, showArchived);
        
    bassinsParCategorie.forEach((categorie, bassins) -> {
        if (categorie != null) {
            String nomCategorie = categorie.getNomCategorie() != null ? 
                categorie.getNomCategorie() : "Catégorie sans nom";
                
            document.add(new Paragraph(nomCategorie)
                .setFontSize(12)
                .setBold()
                .setFontColor(SECONDARY_COLOR)
                .setMarginTop(10));
                
            // Calculs pour la catégorie
            int totalBassins = bassins.size();
            int activeBassins = (int) bassins.stream().filter(b -> !b.isArchive()).count();
            int archivedBassins = (int) bassins.stream().filter(Bassin::isArchive).count();
            int totalStock = bassins.stream().mapToInt(Bassin::getStock).sum();
            double totalValue = bassins.stream()
                .mapToDouble(b -> b.getPrix() * b.getStock())
                .sum();
            long lowStock = bassins.stream()
                .filter(b -> b.getStock() < 5 && b.getStock() > 0)
                .count();
            long outOfStock = bassins.stream()
                .filter(b -> b.getStock() == 0)
                .count();
                
            // Tableau des statistiques de la catégorie
            Table categoryStats = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 1}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(10);
                
            addCategoryStatCard(categoryStats, "Total Bassins", String.valueOf(totalBassins));
            addCategoryStatCard(categoryStats, "Actifs", String.valueOf(activeBassins), SUCCESS_COLOR);
            addCategoryStatCard(categoryStats, "Archivés", String.valueOf(archivedBassins), DANGER_COLOR);
            addCategoryStatCard(categoryStats, "Valeur totale", String.format("%,.2f DT", totalValue));
            
            document.add(categoryStats);
            
            // Tableau détaillé des bassins
            Table bassinsTable = new Table(UnitValue.createPercentArray(new float[]{3, 1, 1, 1, 1, 1, 1}))
                .setWidth(UnitValue.createPercentValue(100));
                
            // En-têtes
            Stream.of("Nom", "Prix", "Stock", "Valeur", "Matériau", "Statut", "Archivé")
                .forEach(header -> {
                    bassinsTable.addHeaderCell(new Cell()
                        .add(new Paragraph(header).setBold())
                        .setBackgroundColor(LIGHT_BG_COLOR)
                        .setTextAlignment(TextAlignment.CENTER));
                });
                
            // Données des bassins
            boolean alternate = false;
            for (Bassin bassin : bassins) {
                DeviceRgb rowColor = alternate ? LIGHT_BG_COLOR : (DeviceRgb) ColorConstants.WHITE;
                alternate = !alternate;
                
                // Nom
                bassinsTable.addCell(new Cell()
                    .add(new Paragraph(bassin.getNomBassin()))
                    .setBackgroundColor(rowColor));
                    
                // Prix
                bassinsTable.addCell(new Cell()
                    .add(new Paragraph(String.format("%,.2f DT", bassin.getPrix())))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setBackgroundColor(rowColor));
                    
                // Stock (avec couleur selon niveau)
                Cell stockCell = new Cell()
                    .add(new Paragraph(String.valueOf(bassin.getStock())))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setBackgroundColor(rowColor);
                    
                if (bassin.getStock() == 0) {
                    stockCell.setFontColor(DANGER_COLOR);
                } else if (bassin.getStock() < 5) {
                    stockCell.setFontColor(WARNING_COLOR);
                }
                bassinsTable.addCell(stockCell);
                
                // Valeur
                bassinsTable.addCell(new Cell()
                    .add(new Paragraph(String.format("%,.2f DT", bassin.getPrix() * bassin.getStock())))
                    .setTextAlignment(TextAlignment.RIGHT)
                    .setBackgroundColor(rowColor));
                    
                // Matériau
                bassinsTable.addCell(new Cell()
                    .add(new Paragraph(bassin.getMateriau() != null ? bassin.getMateriau() : "-"))
                    .setBackgroundColor(rowColor));
                    
                // Statut
                String status = bassin.isDisponible() ? "Disponible" : "Non disponible";
                Cell statusCell = new Cell()
                    .add(new Paragraph(status))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setBackgroundColor(rowColor);
                    
                if (!bassin.isDisponible()) {
                    statusCell.setFontColor(WARNING_COLOR);
                }
                bassinsTable.addCell(statusCell);
                
                // Archivé
                String archivedStatus = bassin.isArchive() ? "Oui" : "Non";
                Cell archivedCell = new Cell()
                    .add(new Paragraph(archivedStatus))
                    .setTextAlignment(TextAlignment.CENTER)
                    .setBackgroundColor(rowColor);
                    
                if (bassin.isArchive()) {
                    archivedCell.setFontColor(DANGER_COLOR);
                }
                bassinsTable.addCell(archivedCell);
            }
            
            document.add(bassinsTable);
            
            // Résumé de la catégorie
            document.add(new Paragraph(String.format(
                "Résumé catégorie: %d bassins (%d actifs, %d archivés), %d en stock faible, %d en rupture de stock",
                totalBassins, activeBassins, archivedBassins, lowStock, outOfStock
            ))
            .setItalic()
            .setFontSize(10)
            .setMarginTop(5)
            .setMarginBottom(15));
        }
    });
}


  private void addCategoryStatCard(Table table, String label, String value) {
    addCategoryStatCard(table, label, value, null);
}

private void addCategoryStatCard(Table table, String label, String value, DeviceRgb valueColor) {
    Cell cell = new Cell()
        .setPadding(8)
        .setBackgroundColor(LIGHT_BG_COLOR);
        
    cell.add(new Paragraph(label)
        .setFontSize(10)
        .setTextAlignment(TextAlignment.CENTER));
        
    Paragraph valuePara = new Paragraph(value)
        .setFontSize(12)
        .setBold()
        .setTextAlignment(TextAlignment.CENTER);
        
    if (valueColor != null) {
        valuePara.setFontColor(valueColor);
    }
    
    cell.add(valuePara);
    table.addCell(cell);
}

private void addTransactionSummary(Document document, Date startDate, Date endDate) {
    document.add(new Paragraph("RÉSUMÉ DES TRANSACTIONS")
        .setFontSize(14)
        .setBold()
        .setFontColor(PRIMARY_COLOR)
        .setMarginTop(15)
        .setMarginBottom(10));
        
    // Récupérer toutes les transactions
    List<Transaction> transactions = transactionRepository.findAll();
    
    // Filtrer par période si nécessaire
    if (startDate != null || endDate != null) {
        LocalDateTime start = startDate != null ? 
            startDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime() : 
            LocalDateTime.of(1970, 1, 1, 0, 0);
            
        LocalDateTime end = endDate != null ? 
            endDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime().plusDays(1) : 
            LocalDateTime.now().plusDays(1);
            
        transactions = transactions.stream()
            .filter(t -> {
                LocalDateTime transDate = t.getDateTransaction().toInstant()
                    .atZone(ZoneId.systemDefault()).toLocalDateTime();
                return !transDate.isBefore(start) && !transDate.isAfter(end);
            })
            .collect(Collectors.toList());
    }
    
    // Calculer les statistiques
    long totalTransactions = transactions.size();
    long entries = transactions.stream().filter(t -> t.getQuantite() > 0).count();
    long exits = transactions.stream().filter(t -> t.getQuantite() < 0).count();
    int totalQuantity = transactions.stream().mapToInt(Transaction::getQuantite).sum();
    
    // Créer le tableau de résumé
    Table summaryTable = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 1}))
        .setWidth(UnitValue.createPercentValue(100));
        
    addSummaryCard(summaryTable, "Total Transactions", String.valueOf(totalTransactions));
    addSummaryCard(summaryTable, "Entrées", String.valueOf(entries), SUCCESS_COLOR);
    addSummaryCard(summaryTable, "Sorties", String.valueOf(exits), DANGER_COLOR);
    addSummaryCard(summaryTable, "Impact Net", String.valueOf(totalQuantity), 
        totalQuantity > 0 ? SUCCESS_COLOR : DANGER_COLOR);
    
    document.add(summaryTable);
    
    // Ajouter la période analysée
    document.add(new Paragraph("Période: " + formatDateShort(startDate) + " à " + formatDateShort(endDate))
        .setItalic()
        .setTextAlignment(TextAlignment.CENTER)
        .setMarginTop(10));
}

private void addUserActivitySummary(Document document, Date startDate, Date endDate) {
    document.add(new Paragraph("ACTIVITÉ DES UTILISATEURS")
        .setFontSize(14)
        .setBold()
        .setFontColor(PRIMARY_COLOR)
        .setMarginTop(15)
        .setMarginBottom(10));
        
    // Récupérer toutes les transactions
    List<Transaction> transactions = transactionRepository.findAll();
    
    // Filtrer par période si nécessaire
    if (startDate != null || endDate != null) {
        LocalDateTime start = startDate != null ? 
            startDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime() : 
            LocalDateTime.of(1970, 1, 1, 0, 0);
            
        LocalDateTime end = endDate != null ? 
            endDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime().plusDays(1) : 
            LocalDateTime.now().plusDays(1);
            
        transactions = transactions.stream()
            .filter(t -> {
                LocalDateTime transDate = t.getDateTransaction().toInstant()
                    .atZone(ZoneId.systemDefault()).toLocalDateTime();
                return !transDate.isBefore(start) && !transDate.isAfter(end);
            })
            .collect(Collectors.toList());
    }
    
    // Grouper par utilisateur
    Map<String, List<Transaction>> transactionsByUser = transactions.stream()
        .collect(Collectors.groupingBy(
            t -> {
                if (t.getUserId() != null) {
                    try {
                        User user = userServiceClient.getUserByUsername(t.getUserId().toString());
                        return user != null ? user.getUsername() : "Inconnu";
                    } catch (Exception e) {
                        return "Inconnu";
                    }
                }
                return "Système";
            }
        ));
    
    // Créer le tableau d'activité
    Table activityTable = new Table(UnitValue.createPercentArray(new float[]{2, 1, 1, 1, 1}))
        .setWidth(UnitValue.createPercentValue(100));
        
    // En-têtes
    Stream.of("Utilisateur", "Transactions", "Entrées", "Sorties", "Impact Net")
        .forEach(header -> {
            activityTable.addHeaderCell(new Cell()
                .add(new Paragraph(header).setBold())
                .setBackgroundColor(SECONDARY_COLOR)
                .setFontColor(ColorConstants.WHITE)
                .setTextAlignment(TextAlignment.CENTER));
        });
    
    // Données
    boolean alternate = false;
    for (Map.Entry<String, List<Transaction>> entry : transactionsByUser.entrySet()) {
        DeviceRgb rowColor = alternate ? LIGHT_BG_COLOR : (DeviceRgb) ColorConstants.WHITE;
        alternate = !alternate;
        
        String username = entry.getKey();
        List<Transaction> userTransactions = entry.getValue();
        
        long entries = userTransactions.stream().filter(t -> t.getQuantite() > 0).count();
        long exits = userTransactions.stream().filter(t -> t.getQuantite() < 0).count();
        int netImpact = userTransactions.stream().mapToInt(Transaction::getQuantite).sum();
        
        activityTable.addCell(new Cell().add(new Paragraph(username)).setBackgroundColor(rowColor));
        activityTable.addCell(new Cell().add(new Paragraph(String.valueOf(userTransactions.size())))
            .setTextAlignment(TextAlignment.CENTER)
            .setBackgroundColor(rowColor));
        activityTable.addCell(new Cell().add(new Paragraph(String.valueOf(entries)))
            .setTextAlignment(TextAlignment.CENTER)
            .setBackgroundColor(rowColor));
        activityTable.addCell(new Cell().add(new Paragraph(String.valueOf(exits)))
            .setTextAlignment(TextAlignment.CENTER)
            .setBackgroundColor(rowColor));
            
        Paragraph netParagraph = new Paragraph(String.valueOf(netImpact))
            .setTextAlignment(TextAlignment.CENTER);
        if (netImpact > 0) {
            netParagraph.setFontColor(SUCCESS_COLOR);
        } else if (netImpact < 0) {
            netParagraph.setFontColor(DANGER_COLOR);
        }
        activityTable.addCell(new Cell().add(netParagraph).setBackgroundColor(rowColor));
    }
    
    document.add(activityTable);
}

private void addSummaryCard(Table table, String title, String value) {
    addSummaryCard(table, title, value, null);
}

private void addSummaryCard(Table table, String title, String value, DeviceRgb valueColor) {
    Cell cell = new Cell()
        .setPadding(10)
        .setBackgroundColor(LIGHT_BG_COLOR);
        
    cell.add(new Paragraph(title)
        .setFontSize(10)
        .setTextAlignment(TextAlignment.CENTER));
        
    Paragraph valuePara = new Paragraph(value)
        .setFontSize(14)
        .setBold()
        .setTextAlignment(TextAlignment.CENTER);
        
    if (valueColor != null) {
        valuePara.setFontColor(valueColor);
    }
    
    cell.add(valuePara);
    table.addCell(cell);
}
private void addStatCard(Table table, String label, String value, DeviceRgb valueColor) {
    Cell cell = new Cell()
        .setPadding(10)
        .setBackgroundColor(LIGHT_BG_COLOR);
        
    cell.add(new Paragraph(label)
        .setFontSize(10)
        .setTextAlignment(TextAlignment.CENTER));
        
    Paragraph valuePara = new Paragraph(value)
        .setFontSize(14)
        .setBold()
        .setTextAlignment(TextAlignment.CENTER);
        
    if (valueColor != null) {
        valuePara.setFontColor(valueColor);
    }
    
    cell.add(valuePara);
    table.addCell(cell);
}

@Override
@Transactional
public Bassin mettreSurCommande(Long id, Integer dureeFabricationJours) {
    Bassin bassin = bassinRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
    
    // Vérifications
    if (bassin.getStock() != 0) {
        throw new IllegalStateException("Le bassin doit avoir un stock à 0 pour être mis sur commande");
    }
    if (dureeFabricationJours == null || dureeFabricationJours <= 0) {
        throw new IllegalArgumentException("La durée de fabrication doit être un nombre positif de jours");
    }
    if (dureeFabricationJours == null) {
        bassin.setDureeFabricationJoursMin(3);
        bassin.setDureeFabricationJoursMax(15);
        bassin.setDureeFabricationJours(null);
    } else {
        bassin.setDureeFabricationJours(dureeFabricationJours);
        bassin.setDureeFabricationJoursMin(dureeFabricationJours);
        bassin.setDureeFabricationJoursMax(dureeFabricationJours);
    }
    
    // Mise à jour du statut
    bassin.setStatut("SUR_COMMANDE");
    bassin.setArchive(false);
    bassin.setSurCommande(true);
    bassin.setDureeFabricationJours(dureeFabricationJours);
    
    // Calcul de la date de disponibilité prévue
    Calendar calendar = Calendar.getInstance();
    calendar.add(Calendar.DAY_OF_YEAR, dureeFabricationJours);
   
    // Notification
    Notification notification = new Notification();
    notification.setMessage("ℹ️ Bassin " + bassin.getNomBassin() + 
            " est maintenant sur commande (Délai: " + dureeFabricationJours + " jours)");
    notification.setType("info");
    notification.setDate(new Date());
    notification.setRead(false);
    notificationRepository.save(notification);
    
    return bassinRepository.save(bassin);
}
@Override
public Bassin updateDureeFabrication(Long id, Integer duree) {
    // If single value provided, use it for both min and max
    return updateDureeFabrication(id, duree, duree);
}

@Override
public Bassin updateDureeFabrication(Long id, Integer dureeMin, Integer dureeMax) {
    // Validation
    if (dureeMin == null || dureeMax == null || dureeMin <= 0 || dureeMax <= 0 || dureeMin > dureeMax) {
        throw new IllegalArgumentException("La durée doit être une fourchette valide (min ≤ max)");
    }
    
    Bassin bassin = bassinRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Bassin non trouvé"));

    if (bassin.getStock() == 0 && !"SUR_COMMANDE".equals(bassin.getStatut())) {
        bassin.setStatut("SUR_COMMANDE");
        bassin.setSurCommande(true);
    }
    
    if (!"SUR_COMMANDE".equals(bassin.getStatut())) {
        throw new IllegalStateException("La durée de fabrication ne peut être modifiée que pour les bassins sur commande");
    }

    // Mise à jour des valeurs
    if (dureeMin.equals(dureeMax)) {
        bassin.setDureeFabricationJours(dureeMin);
        bassin.setDureeFabricationJoursMin(null);
        bassin.setDureeFabricationJoursMax(null);
    } else {
        bassin.setDureeFabricationJours(null);
        bassin.setDureeFabricationJoursMin(dureeMin);
        bassin.setDureeFabricationJoursMax(dureeMax);
    }

    // Notification
    Notification notification = new Notification();
    notification.setMessage("ℹ️ Durée de fabrication mise à jour pour " + bassin.getNomBassin() + 
            ": " + bassin.getDureeFabricationDisplay());
    notification.setType("info");
    notification.setDate(new Date());
    notification.setRead(false);
    notificationRepository.save(notification);
    
    return bassinRepository.save(bassin);
}
}