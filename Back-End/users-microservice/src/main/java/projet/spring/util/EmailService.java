package projet.spring.util;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.AllArgsConstructor;

@AllArgsConstructor
@Service
public class EmailService implements EmailSender{
	
	
	private final JavaMailSender mailSender;

	@Override
	public void sendEmail(String to, String email) {
	    try {
	        MimeMessage mimeMessage = mailSender.createMimeMessage();
	        MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
	        helper.setText(email, true);
	        helper.setTo(to);
	        helper.setSubject("Confirm your email");
	        helper.setFrom("hanabelhadj27@gmail.com");
	        mailSender.send(mimeMessage);
	    } catch (MessagingException e) {
	        System.err.println("Failed to send email: " + e.getMessage());
	        throw new IllegalStateException("Failed to send email", e);
	    }
	}

}