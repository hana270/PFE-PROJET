package com.example.orders_microservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import java.util.Map;

@Service
public class EmailService implements EmailSender {
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    
    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    
    public EmailService(JavaMailSender mailSender, TemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }
    
    @Override
    public void sendEmail(String to, String subject, String templateName, Map<String, Object> variables) {
        logger.info("Preparing to send email to: {}, subject: {}, template: {}", to, subject, templateName);
        
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "utf-8");
            
            // Ajouter le préfixe "email/" au nom du template si nécessaire
            String fullTemplatePath = templateName;
            if (!templateName.startsWith("email/")) {
                fullTemplatePath = "email/" + templateName;
            }
            
            // Process the Thymeleaf template
            Context context = new Context();
            context.setVariables(variables);
            String htmlContent = templateEngine.process(fullTemplatePath, context);
            
            helper.setText(htmlContent, true);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setFrom("hanabelhadj27@gmail.com");
            
            logger.debug("Email prepared successfully, attempting to send...");
            mailSender.send(mimeMessage);
            logger.info("Email sent successfully to: {}", to);
            
        } catch (MailAuthenticationException e) {
            logger.error("Authentication failed when sending email to {}: {}", to, e.getMessage());
            throw e; // Re-throw to be handled by calling code
            
        } catch (MailSendException e) {
            logger.error("Failed to send email to {}: {}", to, e.getMessage());
            throw e; // Re-throw to be handled by calling code
            
        } catch (MailException e) {
            logger.error("Mail exception when sending to {}: {}", to, e.getMessage());
            throw new IllegalStateException("Failed to send email due to mail server error", e);
            
        } catch (MessagingException e) {
            logger.error("Messaging exception when sending to {}: {}", to, e.getMessage());
            throw new IllegalStateException("Failed to prepare email message", e);
            
        } catch (Exception e) {
            logger.error("Unexpected error when sending email to {}: {}", to, e.getMessage());
            throw new IllegalStateException("Unexpected error during email sending", e);
        }
    }
}