package projet.spring.util;

import java.util.Map;

public interface EmailSender {
	   public void sendEmail(String to, String subject, String templateName, Map<String, Object> variables) ;
		    
	   
	   }
