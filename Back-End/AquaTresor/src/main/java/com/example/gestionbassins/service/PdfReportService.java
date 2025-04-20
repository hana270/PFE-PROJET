package com.example.gestionbassins.service;

import com.example.gestionbassins.entities.Bassin;
import com.example.gestionbassins.entities.Transaction;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Date;
import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class PdfReportService {

    public byte[] generateBassinReport(Bassin bassin, List<Transaction> transactions, Date startDate, Date endDate) {
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
             PdfDocument pdfDoc = new PdfDocument(new PdfWriter(outputStream));
             Document document = new Document(pdfDoc)) {
            
            // Ajouter le contenu du PDF
            document.add(new Paragraph("Rapport de stock - Bassin: " + bassin.getNomBassin())
                .setTextAlignment(TextAlignment.CENTER)
                .setFontSize(20));
            
            document.add(new Paragraph("Période: " + startDate + " à " + endDate));
            
            // Tableau des transactions
            Table table = new Table(UnitValue.createPercentArray(new float[]{3, 2, 3, 3}))
                .useAllAvailableWidth();
            
            table.addHeaderCell("Date");
            table.addHeaderCell("Quantité");
            table.addHeaderCell("Type");
            table.addHeaderCell("Raison");
            
            for (Transaction t : transactions) {
                table.addCell(t.getDateTransaction().toString());  // Changé de getDate() à getDateTransaction()
                table.addCell(String.valueOf(t.getQuantite()));
                table.addCell(t.getTypeOperation());
                table.addCell(t.getRaison());
            }
            
            document.add(table);
            
            document.close();
            return outputStream.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Erreur génération PDF", e);
        }
    }
    
    public byte[] generateGlobalReport(List<Bassin> bassins, List<Transaction> transactions, Date startDate, Date endDate) {
        // Implémentation similaire pour le rapport global
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
             PdfDocument pdfDoc = new PdfDocument(new PdfWriter(outputStream));
             Document document = new Document(pdfDoc)) {
            
            // Ajouter le contenu du PDF
            document.add(new Paragraph("Rapport global de stock")
                .setTextAlignment(TextAlignment.CENTER)
                .setFontSize(20));
            
            document.add(new Paragraph("Période: " + startDate + " à " + endDate));
            
            // Tableau des bassins
            Table bassinTable = new Table(UnitValue.createPercentArray(new float[]{3, 2, 2}))
                .useAllAvailableWidth();
            
            bassinTable.addHeaderCell("Nom");
            bassinTable.addHeaderCell("Stock");
            bassinTable.addHeaderCell("Statut");
            
            for (Bassin b : bassins) {
                bassinTable.addCell(b.getNomBassin());
                bassinTable.addCell(String.valueOf(b.getStock()));
                bassinTable.addCell(b.isArchive() ? "Archivé" : "Actif");
            }
            
            document.add(bassinTable);
            
            // Tableau des transactions
            Table transactionTable = new Table(UnitValue.createPercentArray(new float[]{3, 2, 3, 3}))
                .useAllAvailableWidth();
            
            transactionTable.addHeaderCell("Date");
            transactionTable.addHeaderCell("Bassin");
            transactionTable.addHeaderCell("Quantité");
            transactionTable.addHeaderCell("Type");
            
            for (Transaction t : transactions) {
            	transactionTable.addCell(t.getDateTransaction().toString());  // Changé de getDate() à getDateTransaction()
            	transactionTable.addCell(String.valueOf(t.getQuantite()));
            	transactionTable.addCell(t.getTypeOperation());
            	transactionTable.addCell(t.getRaison());
            }
            
            document.add(transactionTable);
            
            document.close();
            return outputStream.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Erreur génération PDF", e);
        }
    }
}