package projet.spring.restControllers;

import java.io.IOException;
import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import projet.spring.dto.UpdateProfileRequest;
import projet.spring.entities.User;
import projet.spring.repos.UserRepository;
import projet.spring.service.FileStorageService;
import projet.spring.service.UserService;
import projet.spring.service.exceptions.*;
import projet.spring.service.register.RegistrationRequest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.MalformedURLException;
import java.nio.file.Path;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/users")
public class UserRestController {

	@Autowired
	UserRepository userRep;

	@Autowired
	UserService userService;

	@Autowired
	private FileStorageService fileStorageService;

	@GetMapping("/all")
	public List<User> getAllUsers() {
		System.out.println("Fetching all users with role CLIENT");
		List<User> users = userRep.findByRoles_Role("CLIENT");
		System.out.println("Users found: " + users.size());
		return users;
	}

	@GetMapping("/list-installateurs")
	public List<User> getAllInstallateurs() {
		System.out.println("Fetching all users with role INSTALLATEUR");
		List<User> users = userRep.findByRoles_Role("INSTALLATEUR");
		System.out.println("Users found: " + users.size());
		return users;
	}

	@PostMapping("/register")
	public User register(@RequestBody RegistrationRequest request) {
		return userService.registerUser(request);
	}

	@GetMapping("/verifyEmail/{token}")
	public User verifyEmail(@PathVariable("token") String token) {
		return userService.validateToken(token);
	}

	@PutMapping("/updateProfile")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request) {
        try {
            boolean isUpdated = userService.updateUserProfile(
                request.getUsername(), 
                request.getNewEmail(), 
                request.getNewPassword(), 
                request.getCurrentPassword(), 
                request.getProfileImagePath()
            );
            if (isUpdated) {
                return ResponseEntity.ok().body(Map.of("message", "Profil mis à jour avec succès."));
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Une erreur est survenue."));
            }
        } catch (EmailAlreadyExistsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
        }
    }

	@PostMapping("/uploadProfileImage")
	public ResponseEntity<?> uploadProfileImage(
	    @RequestParam("file") MultipartFile file,
	    @RequestParam String username,
	    @RequestParam String currentPassword) {
	    try {
	        if (file.isEmpty()) {
	            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
	                    .body(Map.of("message", "Le fichier est vide."));
	        }

	        // Enregistrer le fichier et récupérer le nom du fichier
	        String fileName = fileStorageService.storeFile(file);

	        // Mettre à jour le profil utilisateur avec le nom du fichier
	        boolean isUpdated = userService.updateUserProfile(username, null, null, currentPassword, fileName);
	        if (isUpdated) {
	            // Construire l'URL complète pour l'affichage
	            String fileDownloadUri = ServletUriComponentsBuilder.fromCurrentContextPath()
	                    .path("/uploads/") // Assurez-vous que ce chemin correspond à votre configuration
	                    .path(fileName)
	                    .toUriString();

	            return ResponseEntity.ok().body(Map.of(
	                "message", "Image de profil mise à jour avec succès.",
	                "imageUrl", fileDownloadUri
	            ));
	        } else {
	            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
	                    .body(Map.of("message", "Une erreur est survenue lors de la mise à jour du profil."));
	        }
	    } catch (IOException e) {
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
	                .body(Map.of("message", "Erreur lors de l'upload de l'image."));
	    } catch (RuntimeException e) {
	        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
	    }
	}
	
	@GetMapping("/downloadFile/{fileName}")
	public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
	    try {
	        Path filePath = fileStorageService.loadFile(fileName);
	        Resource resource = new UrlResource(filePath.toUri());

	        if (resource.exists() || resource.isReadable()) {
	            return ResponseEntity.ok()
	                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
	                    .body(resource);
	        } else {
	            throw new RuntimeException("Impossible de lire le fichier : " + fileName);
	        }
	    } catch (MalformedURLException e) {
	        throw new RuntimeException("Erreur lors de la lecture du fichier : " + fileName, e);
	    }
	}

	@GetMapping("/userProfile")
	public ResponseEntity<?> getUserProfile(Authentication authentication) {
	    if (authentication == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Non authentifié"));
	    }
	    String username = authentication.getName();
	    User user = userRep.findByUsername(username);
	    if (user == null) {
	        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Utilisateur non trouvé"));
	    }
	    Map<String, Object> userInfo = new HashMap<>();
	    userInfo.put("email", user.getEmail());
	    userInfo.put("profileImage", user.getProfileImage()); // Assurez-vous que ce champ contient l'URL de l'image
	    userInfo.put("username", user.getUsername());
	    return ResponseEntity.ok(userInfo);
	}
    
    
	@PostMapping("/send-installer-invitation")
	public ResponseEntity<?> sendInstallerInvitation(@RequestBody Map<String, String> request) {
		String email = request.get("email");
		userService.sendInstallerInvitation(email);
		return ResponseEntity.ok().body(Map.of("message", "Invitation envoyée avec succès !"));
	}

	@PostMapping("/register-installer")
	public ResponseEntity<?> registerInstaller(@RequestBody RegistrationRequest request) {
		System.out.println("Received request: " + request);
		try {
			User user = userService.registerInstaller(request);
			System.out.println("User registered: " + user);
			return ResponseEntity.ok(user);
		} catch (Exception e) {
			System.out.println("Error: " + e.getMessage());
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
		}
	}

	@PostMapping("/request-reset-password")
	public ResponseEntity<?> requestResetPassword(@RequestBody Map<String, String> request) {
		String email = request.get("email");

		User user = userService.findUserByEmail(email);
		if (user == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Email non trouvé."));
		}

		String validationCode = userService.generateValidationCode();
		user.setValidationCode(validationCode);
		userRep.save(user);

		String emailContent = "Votre code de validation est : " + validationCode;
		userService.sendEmailUser(user, emailContent);

		return ResponseEntity.ok().body(Map.of("message", "Un code de validation a été envoyé à votre email."));
	}

	@PostMapping("/validate-code")
	public ResponseEntity<?> validateCode(@RequestBody Map<String, String> request) {
		String email = request.get("email");
		String code = request.get("code");

		if (userService.validateCode(email, code)) {
			return ResponseEntity.ok().body(Map.of("message", "Code valide."));
		} else {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Code invalide."));
		}
	}

	@PostMapping("/reset-password")
	public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
		String email = request.get("email");
		String newPassword = request.get("newPassword");

		userService.resetPassword(email, newPassword);
		return ResponseEntity.ok().body(Map.of("message", "Mot de passe réinitialisé avec succès."));
	}

	

	@PutMapping("/deactivate/{userId}")
	public ResponseEntity<?> deactivateUser(@PathVariable Long userId) {
		try {
			userService.deactivateUser(userId);
			return ResponseEntity.ok().body(Map.of("message", "Compte désactivé avec succès."));
		} catch (RuntimeException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
		}
	}

	@PutMapping("/activate/{userId}")
	public ResponseEntity<?> activateUser(@PathVariable Long userId) {
		try {
			userService.activateUser(userId);
			return ResponseEntity.ok().body(Map.of("message", "Compte activé avec succès."));
		} catch (RuntimeException e) {
			return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
		}
	}
	   @GetMapping("/validate/{userId}")
	    public ResponseEntity<User> validateUser(@PathVariable Long userId) {
	        User user = userRep.findById(userId)
	            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
	        return ResponseEntity.ok(user);
	    }
	   @GetMapping("/username/{username}")
	    public ResponseEntity<User> getUserByUsername(@PathVariable String username) {
	        User user = userService.findUserByUsername(username);
	        if (user == null) {
	            return ResponseEntity.notFound().build();
	        }
	        return ResponseEntity.ok(user);
	    }
	   
	   
}
