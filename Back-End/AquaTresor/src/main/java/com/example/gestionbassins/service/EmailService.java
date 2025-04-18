package com.example.gestionbassins.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.MimeMessageHelper;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendEmail(String to, String subject, String content) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);
            
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(content, true); // true pour indiquer que c'est du HTML
            
            mailSender.send(message);
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de l'envoi de l'email", e);
        }
    }

    public void sendPanierExpirationWarning(String email, String sessionId) {
        String subject = "Votre panier va bientôt expirer";
        String content = "<p>Cher client,</p>"
            + "<p>Votre panier va expirer dans 30 minutes. Veuillez finaliser votre commande.</p>"
            + "<p>Cordialement,<br/>L'équipe AquaTrésor</p>";
        
        sendEmail(email, subject, content);
    }

    public void sendCartReminderEmail(String email, int itemCount) {
        String subject = "Vous avez des articles dans votre panier";
        String content = "<p>Cher client,</p>"
            + "<p>Vous avez " + itemCount + " article(s) dans votre panier qui vous attendent.</p>"
            + "<p>Cordialement,<br/>L'équipe AquaTrésor</p>";
        
        sendEmail(email, subject, content);
    }
}