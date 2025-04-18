package projet.spring.service.register;
import lombok.*;
@Data
@AllArgsConstructor
@NoArgsConstructor
public class RegistrationRequest {
	private String username;
	private String password;
	private String email;
	
}
