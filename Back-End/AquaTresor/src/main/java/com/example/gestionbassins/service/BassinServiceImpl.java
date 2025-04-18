package com.example.gestionbassins.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;
import com.itextpdf.layout.element.LineSeparator;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import com.example.gestionbassins.dto.BassinDTO;
//import com.example.gestionbassins.dto.ImageDTO;
import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.BassinPersonnalise;
import com.example.gestionbassins.entities.Categorie;
//import com.example.gestionbassins.entities.Image;
import com.example.gestionbassins.entities.ImageBassin;
import com.example.gestionbassins.entities.Notification;
import com.example.gestionbassins.entities.Transaction;
import com.example.gestionbassins.repos.*;
import com.example.gestionbassins.repos.ImageBassinRepository;

import java.util.stream.Stream;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.kernel.pdf.canvas.draw.SolidLine;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.layout.properties.AreaBreakType;
import com.itextpdf.layout.properties.HorizontalAlignment;
import java.io.ByteArrayInputStream;

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

	/*
	 * @Override public Bassin getBassin(Long id) { return
	 * bassinRepository.findByIdWithImages(id) .orElseThrow(() -> new
	 * RuntimeException("Bassin non trouvé avec l'ID : " + id)); }
	 */
	/**
	 * ************
	 *******/

	/*
	 * @Override public Evenement upadteEvenement(Evenement ev) { //Long
	 * oldEvImageId =
	 * this.getEvenement(ev.getIdEvenement()).getImage().getIdImage(); //Long
	 * newEvImageId = ev.getImage().getIdImage(); Evenement evUpdated =
	 * evenementRepository.save(ev); //if (oldEvImageId != newEvImageId) // si
	 * l'image a été modifiée //imageRepository.deleteById(oldEvImageId);
	 * 
	 * return evUpdated; }
	 */

	@Override
	public void deleteBassin(Bassin b) {
		bassinRepository.delete(b);
	}

	@Autowired
	private BassinPersonnaliseRepository bassinPersonnaliseRepository;

	@Autowired
	private AccessoireRepository accessoireRepository;
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

	// new
	@Override
	public List<Bassin> findByNomBassin(String nom) {

		return bassinRepository.findByNomBassin(nom);
	}

	@Override
	public List<Bassin> findByNomBassinContains(String nom) {
		// TODO Auto-generated method stub
		return bassinRepository.findByNomBassinContains(nom);
	}

	@Override
	public List<Bassin> findByNomPrix(String nom, Double prix) {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public List<Bassin> findByCategorie(Categorie c) {
		// TODO Auto-generated method stub
		return bassinRepository.findByCategorie(c);
	}

	@Override
	public List<Bassin> findByCategorieIdCategorie(Long id) {
		// TODO Auto-generated method stub
		return bassinRepository.findByCategorieIdCategorie(id);
	}

	@Override
	public List<Bassin> findByOrderByNomBassinAsc() {
		// TODO Auto-generated method stub
		return bassinRepository.findByOrderByNomBassinAsc();
	}

	@Override
	public List<Bassin> trierBassinsNomsPrix() {
		// TODO Auto-generated method stub
		return bassinRepository.trierBassinNomPrix();
	}

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

	/********** code haynaaa ************/

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
	public Bassin archiverBassin(Long id) {
		Bassin bassin = bassinRepository.findById(id).orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
		bassin.setArchive(true);
		return bassinRepository.save(bassin);
	}

	@Override
	public Bassin desarchiverBassin(Long id, int nouvelleQuantite) {
		Bassin bassin = bassinRepository.findById(id).orElseThrow(() -> new RuntimeException("Bassin non trouvé"));
		bassin.setArchive(false);
		bassin.setStock(nouvelleQuantite);
		return bassinRepository.save(bassin);
	}

	@Override
	public Bassin mettreAJourQuantite(Long id, int quantite, String raison) {
		Bassin bassin = bassinRepository.findById(id).orElseThrow(() -> new RuntimeException("Bassin non trouvé"));

		// Ancien stock pour la comparaison
		int ancienStock = bassin.getStock();

		// Mise à jour du stock
		bassin.setStock(bassin.getStock() + quantite);

		// Créer une transaction
		Transaction transaction = new Transaction();
		transaction.setBassin(bassin);
		transaction.setQuantite(quantite);
		transaction.setRaison(raison);
		transaction.setDateTransaction(new Date());
		transactionRepository.save(transaction);

		// Vérifier si le stock est devenu faible et créer une notification si
		// nécessaire
		if (ancienStock >= 5 && bassin.getStock() < 5) {
			Notification notification = new Notification();
			notification.setMessage("⚠️ ALERTE : Stock faible pour le bassin " + bassin.getNomBassin() + " (Quantité : "
					+ bassin.getStock() + ")");
			notification.setType("warning"); // Set notification type to warning for low stock
			notification.setDate(new Date());
			notification.setRead(false);
			notificationRepository.save(notification);
		}

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

	public byte[] generateStockReport() {
		try {
			ByteArrayOutputStream baos = new ByteArrayOutputStream();
			PdfWriter writer = new PdfWriter(baos);
			PdfDocument pdfDoc = new PdfDocument(writer);
			Document document = new Document(pdfDoc);

			// Debug log to check if the document is initialized
			System.out.println("PDF Document initialized: " + (pdfDoc != null));
			System.out.println("Number of pages: " + pdfDoc.getNumberOfPages());

			// Styles et polices
			PdfFont boldFont = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
			PdfFont normalFont = PdfFontFactory.createFont(StandardFonts.HELVETICA);

			// En-tête avec logo
			Table header = new Table(2);
			header.setWidth(UnitValue.createPercentValue(100));

			// Logo de l'entreprise (image vide en attendant)
			Cell logoCell = new Cell();
			Image logo = new Image(ImageDataFactory.create("C:/shared/icone_rapport_stock/icon.jpg"));
			logo.setHeight(60);
			logoCell.add(logo);
			logoCell.setBorder(Border.NO_BORDER);
			header.addCell(logoCell);

			// Informations de l'entreprise
			Cell infoCell = new Cell();
			infoCell.setBorder(Border.NO_BORDER);
			infoCell.setTextAlignment(TextAlignment.RIGHT);
			infoCell.add(new Paragraph("RAPPORT DE STOCK").setFont(boldFont).setFontSize(18));
			infoCell.add(new Paragraph(
					"Généré le: " + java.time.LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
			infoCell.add(new Paragraph("Ref: INV-" + System.currentTimeMillis() / 1000));
			header.addCell(infoCell);

			document.add(header);
			document.add(new Paragraph(" ").setHeight(20)); // Espacement

			// Résumé du stock
			List<Bassin> bassins = getBassinsNonArchives();
			List<Transaction> transactions = getAllTransactions();

			Paragraph summaryTitle = new Paragraph("RÉSUMÉ DU STOCK").setFont(boldFont).setFontSize(14)
					.setFontColor(new DeviceRgb(41, 128, 185));
			document.add(summaryTitle);

			document.add(new LineSeparator(new SolidLine(1f)));

			// Statistiques de stock
			Table summaryTable = new Table(2);
			summaryTable.setWidth(UnitValue.createPercentValue(100));
			summaryTable.setMarginTop(10);

			// Nombre total de bassins
			summaryTable.addCell(new Cell().setBorder(Border.NO_BORDER).add(new Paragraph("Nombre total de bassins:")));
			summaryTable.addCell(new Cell().setBorder(Border.NO_BORDER)
					.add(new Paragraph(String.valueOf(bassins.size())).setTextAlignment(TextAlignment.RIGHT)));

			// Bassins en stock faible
			long lowStockCount = bassins.stream().filter(b -> b.getStock() < 5 && b.getStock() > 0).count();
			summaryTable.addCell(
					new Cell().setBorder(Border.NO_BORDER).add(new Paragraph("Bassins en stock faible (< 5):")));
			summaryTable.addCell(new Cell().setBorder(Border.NO_BORDER)
					.add(new Paragraph(String.valueOf(lowStockCount)).setTextAlignment(TextAlignment.RIGHT)));

			// Bassins en rupture
			long outOfStockCount = bassins.stream().filter(b -> b.getStock() == 0).count();
			summaryTable
					.addCell(new Cell().setBorder(Border.NO_BORDER).add(new Paragraph("Bassins en rupture de stock:")));
			summaryTable.addCell(new Cell().setBorder(Border.NO_BORDER)
					.add(new Paragraph(String.valueOf(outOfStockCount)).setTextAlignment(TextAlignment.RIGHT)));

			// Valeur totale du stock
			double valeurTotale = bassins.stream().mapToDouble(b -> b.getPrix() * b.getStock()).sum();
			summaryTable.addCell(new Cell().setBorder(Border.NO_BORDER).add(new Paragraph("Valeur totale du stock:")));
			summaryTable.addCell(new Cell().setBorder(Border.NO_BORDER)
					.add(new Paragraph(String.format("%.2f DT", valeurTotale)).setTextAlignment(TextAlignment.RIGHT)));

			document.add(summaryTable);
			document.add(new Paragraph(" ").setHeight(20)); // Espacement

			// Liste détaillée des bassins
			Paragraph inventoryTitle = new Paragraph("INVENTAIRE DÉTAILLÉ").setFont(boldFont).setFontSize(14)
					.setFontColor(new DeviceRgb(41, 128, 185));
			document.add(inventoryTitle);

			document.add(new LineSeparator(new SolidLine(1f)));
			document.add(new Paragraph(" ").setHeight(10)); // Espacement

			// Tableau principal des bassins
			Table table = new Table(new float[] { 1, 3, 2, 1.5f, 1, 1.5f });
			table.setWidth(UnitValue.createPercentValue(100));

			// En-têtes du tableau
			String[] headers = { "ID", "Nom du Bassin", "Catégorie", "Prix unitaire", "Stock", "Valeur totale" };
			for (String headerText : headers) {
				Cell a = new Cell();
				a.setBackgroundColor(new DeviceRgb(52, 152, 219));
				a.setFontColor(ColorConstants.WHITE);
				a.add(new Paragraph(headerText).setFont(boldFont));
				a.setPadding(5);
				table.addHeaderCell(a);
			}

			// Ajouter les données de chaque bassin
			boolean evenRow = false;
			for (Bassin bassin : bassins) {
				// Alternance de couleurs pour les lignes
				DeviceRgb rowColor = evenRow ? new DeviceRgb(240, 240, 240) : new DeviceRgb(255, 255, 255);
				evenRow = !evenRow;

				// Coloration spéciale pour stock faible
				DeviceRgb stockColor = bassin.getStock() < 5 ? new DeviceRgb(231, 76, 60) : new DeviceRgb(46, 204, 113);

				// ID
				Cell cell = new Cell().setBackgroundColor(rowColor);
				cell.add(new Paragraph(String.valueOf(bassin.getIdBassin())));
				table.addCell(cell);

				// Nom
				cell = new Cell().setBackgroundColor(rowColor);
				cell.add(new Paragraph(bassin.getNomBassin()));
				table.addCell(cell);

				// Catégorie
				cell = new Cell().setBackgroundColor(rowColor);
				cell.add(new Paragraph(bassin.getCategorie().getNomCategorie()));
				table.addCell(cell);

				// Prix
				cell = new Cell().setBackgroundColor(rowColor);
				cell.add(new Paragraph(String.format("%.2f DT", bassin.getPrix())));
				table.addCell(cell);

				// Stock
				cell = new Cell().setBackgroundColor(rowColor);
				cell.add(new Paragraph(String.valueOf(bassin.getStock())).setFontColor(stockColor));
				table.addCell(cell);

				// Valeur totale
				cell = new Cell().setBackgroundColor(rowColor);
				cell.add(new Paragraph(String.format("%.2f DT", bassin.getPrix() * bassin.getStock())));
				table.addCell(cell);
			}

			document.add(table);
			document.add(new Paragraph(" ").setHeight(20)); // Espacement

			// Historique des transactions
			document.add(new AreaBreak(AreaBreakType.NEXT_PAGE)); // Nouvelle page

			Paragraph historyTitle = new Paragraph("HISTORIQUE DES TRANSACTIONS").setFont(boldFont).setFontSize(14)
					.setFontColor(new DeviceRgb(41, 128, 185));
			document.add(historyTitle);

			document.add(new LineSeparator(new SolidLine(1f)));
			document.add(new Paragraph(" ").setHeight(10)); // Espacement

			if (transactions.isEmpty()) {
				document.add(new Paragraph("Aucune transaction enregistrée.").setItalic());
			} else {
				// Tableau d'historique
				Table historyTable = new Table(new float[] { 1, 3, 1.5f, 2, 2.5f });
				historyTable.setWidth(UnitValue.createPercentValue(100));

				// En-têtes du tableau d'historique
				String[] historyHeaders = { "ID", "Bassin", "Quantité", "Date", "Raison" };
				for (String headerText : historyHeaders) {
					Cell h = new Cell();
					h.setBackgroundColor(new DeviceRgb(52, 152, 219));
					h.setFontColor(ColorConstants.WHITE);
					h.add(new Paragraph(headerText).setFont(boldFont));
					h.setPadding(5);
					historyTable.addHeaderCell(h);
				}

				// Ajouter les données de chaque transaction
				DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
				evenRow = false;

				for (Transaction transaction : transactions) {
					// Alternance de couleurs pour les lignes
					DeviceRgb rowColor = evenRow ? new DeviceRgb(240, 240, 240) : new DeviceRgb(255, 255, 255);
					evenRow = !evenRow;

					// Déterminer la couleur de la quantité (rouge pour négatif, vert pour positif)
					DeviceRgb quantityColor = transaction.getQuantite() < 0 ? new DeviceRgb(231, 76, 60)
							: new DeviceRgb(46, 204, 113);

					// ID
					Cell cell = new Cell().setBackgroundColor(rowColor);
					cell.add(new Paragraph(String.valueOf(transaction.getIdTransaction())));
					historyTable.addCell(cell);

					// Nom du bassin
					cell = new Cell().setBackgroundColor(rowColor);
					cell.add(new Paragraph(transaction.getBassin().getNomBassin()));
					historyTable.addCell(cell);

					// Quantité avec signe + ou -
					cell = new Cell().setBackgroundColor(rowColor);
					String quantityText = transaction.getQuantite() > 0 ? "+" + transaction.getQuantite()
							: String.valueOf(transaction.getQuantite());
					cell.add(new Paragraph(quantityText).setFontColor(quantityColor));
					historyTable.addCell(cell);

					// Date
					cell = new Cell().setBackgroundColor(rowColor);
					LocalDateTime dateTime = transaction.getDateTransaction().toInstant().atZone(ZoneId.systemDefault())
							.toLocalDateTime();
					cell.add(new Paragraph(dateTime.format(dateFormatter)));
					historyTable.addCell(cell);

					// Raison
					cell = new Cell().setBackgroundColor(rowColor);
					cell.add(new Paragraph(transaction.getRaison()));
					historyTable.addCell(cell);
				}

				document.add(historyTable);
			}

			// Pied de page avec graphique (exemple simplifié)
			document.add(new AreaBreak(AreaBreakType.NEXT_PAGE)); // Nouvelle page

			Paragraph chartTitle = new Paragraph("GRAPHIQUES D'ANALYSE").setFont(boldFont).setFontSize(14)
					.setFontColor(new DeviceRgb(41, 128, 185));
			document.add(chartTitle);

			document.add(new LineSeparator(new SolidLine(1f)));
			document.add(new Paragraph(" ").setHeight(20)); // Espacement

			document.add(new Paragraph("Graphiques d'analyse non disponibles dans cette version.").setItalic());

			// Fermer le document pour finaliser les pages
			document.close();

			// Créer un nouveau document pour ajouter les numéros de page
			PdfDocument pdfDocNumbered = new PdfDocument(new PdfReader(new ByteArrayInputStream(baos.toByteArray())),
					new PdfWriter(new ByteArrayOutputStream()));
			Document documentNumbered = new Document(pdfDocNumbered);

			// Pied de page avec numérotation
			int numberOfPages = pdfDocNumbered.getNumberOfPages();
			for (int i = 1; i <= numberOfPages; i++) {
				// Assurez-vous que la page existe avant d'y accéder
				PdfPage page = pdfDocNumbered.getPage(i);
				if (page != null) {
					// Vérifiez que la page a une taille définie
					Rectangle pageSize = page.getPageSize();
					if (pageSize != null) {
						new PdfCanvas(page).beginText()
								.setFontAndSize(PdfFontFactory.createFont(StandardFonts.HELVETICA), 8)
								.moveText(pageSize.getWidth() / 2, 20)
								.showText(String.format("Page %s sur %s", i, numberOfPages)).endText();
					}
				}
			}

			pdfDocNumbered.close();

			return baos.toByteArray();
		} catch (Exception e) {
			e.printStackTrace();
			throw new RuntimeException("Erreur lors de la génération du rapport PDF: " + e.getMessage());
		}
	}

	@Override
	public List<Transaction> getTransactions() {
		return transactionRepository.findAll();
	}

	// Méthode pour récupérer toutes les transactions
	private List<Transaction> getAllTransactions() {
		return transactionRepository.findAll();
	}
}
