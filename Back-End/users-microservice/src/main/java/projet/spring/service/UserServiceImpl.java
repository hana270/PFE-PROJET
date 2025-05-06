package projet.spring.service;

import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import projet.spring.entities.Role;
import projet.spring.entities.User;
import projet.spring.repos.RoleRepository;
import projet.spring.repos.UserRepository;
import projet.spring.service.exceptions.AlreadyVerifiedException;
import projet.spring.service.exceptions.EmailAlreadyExistsException;
import projet.spring.service.exceptions.ExpiredTokenException;
import projet.spring.service.exceptions.InvalidTokenException;
import projet.spring.service.exceptions.UsernameAlreadyExistsException;
import projet.spring.service.register.RegistrationRequest;
import projet.spring.service.register.VerificationToken;
import projet.spring.service.register.VerificationTokenRepository;
import projet.spring.util.EmailSender;
import projet.spring.util.EmailService;

@Service
@Transactional
public class UserServiceImpl implements UserService {

	@Autowired
	private final UserRepository userRep;
	private final RoleRepository roleRep;

	@Autowired
	private BCryptPasswordEncoder bCryptPasswordEncoder;

	private final VerificationTokenRepository verificationTokenRepo;

	@Autowired
	private EmailSender emailSender;
	private final EmailService emailService;

	@Autowired
	public UserServiceImpl(UserRepository userRep, RoleRepository roleRep, BCryptPasswordEncoder bCryptPasswordEncoder,
			VerificationTokenRepository verificationTokenRepo, EmailService emailService) {
		this.userRep = userRep;
		this.roleRep = roleRep;
		this.bCryptPasswordEncoder = bCryptPasswordEncoder;
		this.verificationTokenRepo = verificationTokenRepo;
		this.emailSender = emailSender;
		this.emailService = emailService;
	}

	@Override
	public User saveUser(User user) {
		if (!user.getPassword().startsWith("$2a$")) {
			user.setPassword(bCryptPasswordEncoder.encode(user.getPassword()));
		}
		return userRep.save(user);
	}
@Override
public User addRoleToUser(String username, String rolename) {
    User usr = userRep.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));

    Role r = roleRep.findByRole(rolename)
            .orElseThrow(() -> new RuntimeException("Role not found: " + rolename));

    usr.getRoles().add(r);
    return userRep.save(usr);
}

@Override
public User findUserByUsername(String username) {
    return userRep.findByUsername(username)
            .orElse(null);
}

@Override
public User findUserByEmail(String email) {
    return userRep.findByEmail(email)
            .orElse(null);
}
public Role addRole(Role role) {
		return roleRep.save(role);
	}

	public void createInstallerRole() {
		if (roleRep.findByRole("INSTALLATEUR").isEmpty()) {
			Role installerRole = new Role("INSTALLATEUR");
			roleRep.save(installerRole);
		}
	}


	
	@Override
	public User registerUser(RegistrationRequest request) {
    // Vérifier si l'email existe déjà avec une requête plus précise
    Optional<User> existingUserByEmail = userRep.findByEmail(request.getEmail());
    if (existingUserByEmail.isPresent()) {
        throw new EmailAlreadyExistsException("Cet email est déjà utilisé");
    }
    
    // Vérifier si le nom d'utilisateur existe déjà avec une requête plus précise
    Optional<User> existingUserByUsername = userRep.findByUsername(request.getUsername());
    if (existingUserByUsername.isPresent()) {
        throw new UsernameAlreadyExistsException("Ce nom d'utilisateur est déjà utilisé");
    }

    // Créer un nouvel utilisateur
    User newUser = new User();
    newUser.setUsername(request.getUsername());
    newUser.setEmail(request.getEmail().toLowerCase()); // Normaliser l'email
    newUser.setPassword(bCryptPasswordEncoder.encode(request.getPassword()));
    newUser.setFirstName(request.getFirstName());
    newUser.setLastName(request.getLastName());
    newUser.setPhone(request.getPhone());
    newUser.setDefaultAddress(request.getDefaultAddress());
    newUser.setEnabled(false);

    // Assigner le rôle CLIENT
    Role clientRole = roleRep.findByRole("CLIENT")
            .orElseThrow(() -> new RuntimeException("Role CLIENT non trouvé"));
    newUser.setRoles(Set.of(clientRole));

    // Enregistrer l'utilisateur
    User savedUser = userRep.save(newUser);

    // Générer et envoyer le code de vérification
    String code = this.generateCode();
    VerificationToken token = new VerificationToken(code, savedUser);
    verificationTokenRepo.save(token);

    // Envoyer l'email de vérification
    sendEmailUser(savedUser, code);

    return savedUser;
}

	
	private String generateCode() {
		Random random = new Random();
		Integer code = 100000 + random.nextInt(900000);
		return code.toString();
	}

	@Override
	@Transactional(noRollbackFor = {InvalidTokenException.class, AlreadyVerifiedException.class, ExpiredTokenException.class})
	public User validateToken(String code) {
	    VerificationToken token = verificationTokenRepo.findByToken(code);
	    if (token == null) {
	        throw new InvalidTokenException("Code de vérification invalide");
	    }

	    User user = token.getUser();
	    if (user.getEnabled()) {
	        throw new AlreadyVerifiedException("Ce compte est déjà vérifié");
	    }

	    if (token.isExpired()) {
	        verificationTokenRepo.delete(token);
	        throw new ExpiredTokenException("Le code a expiré, veuillez en demander un nouveau");
	    }

	    // Supprimer tous les tokens existants pour cet utilisateur
	    verificationTokenRepo.deleteByUser(user);
	    
	    // Activer le compte
	    user.setEnabled(true);
	    User savedUser = userRep.save(user);

	    // Envoyer l'email de bienvenue
	    sendWelcomeEmail(savedUser);

	    return savedUser;
	}

	@Override
	@Transactional
	public void resendVerificationCode(String email) {
	    User user = userRep.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));

	    if (user.getEnabled()) {
	        throw new AlreadyVerifiedException("Ce compte est déjà vérifié");
	    }

	    // Supprimer tous les anciens tokens
	    verificationTokenRepo.deleteByUser(user);

	    // Générer un nouveau code
	    String newCode = generateCode();
	    VerificationToken newToken = new VerificationToken(newCode, user);
	    verificationTokenRepo.save(newToken);

	    // Envoyer le nouveau code
	    sendEmailUser(user, newCode);
	}
	
	@Override
public boolean updateUserProfile(String username, String newEmail, String newPassword, 
        String currentPassword, String profileImagePath) {
    User user = userRep.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

    // Vérification du mot de passe actuel
    if ((newEmail != null && !newEmail.isEmpty()) || (newPassword != null && !newPassword.isEmpty())) {
        if (currentPassword == null || currentPassword.isEmpty()) {
            throw new RuntimeException("Le mot de passe actuel est requis");
        }
        if (!bCryptPasswordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Mot de passe actuel incorrect");
        }
    }

    // Mise à jour de l'email
    if (newEmail != null && !newEmail.isEmpty()) {
        userRep.findByEmail(newEmail)
            .ifPresent(existingUser -> {
                if (!existingUser.getUsername().equals(username)) {
                    throw new EmailAlreadyExistsException("Cet email est déjà utilisé");
                }
            });
        user.setEmail(newEmail);
    }

    // Mise à jour du mot de passe
    if (newPassword != null && !newPassword.isEmpty()) {
        user.setPassword(bCryptPasswordEncoder.encode(newPassword));
    }

    // Mise à jour de l'image de profil
    if (profileImagePath != null && !profileImagePath.isEmpty()) {
        user.setProfileImage(profileImagePath);
    }
    
    userRep.save(user);
    return true;
}


	@Override
	public String generateResetToken(String email) {
	    User user = userRep.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));

	    String token = UUID.randomUUID().toString();
	    user.setResetToken(token);
	    userRep.save(user);

	    return token;
	}

	@Override
	public String generateValidationCode() {
		Random random = new Random();
		// Génère un code à 6 chiffres entre 100000 et 999999
		int code = 100000 + random.nextInt(900000);
		return String.valueOf(code);
	}

	@Override
	public boolean validateCode(String email, String code) {
	    User user = userRep.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));

	    return code.equals(user.getValidationCode());
	}

	@Override
	public void resetPassword(String email, String newPassword) {
		User user = userRep.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));

		user.setPassword(bCryptPasswordEncoder.encode(newPassword));
		user.setResetToken(null);
		user.setValidationCode(null);
		userRep.save(user);
	}

	@Override
	public void deactivateUser(Long userId) {
		User user = userRep.findById(userId)
				.orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'ID : " + userId));
		user.setEnabled(false); // Désactiver le compte
		userRep.save(user);
	}

	@Override
	public void activateUser(Long userId) {
		User user = userRep.findById(userId)
				.orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'ID : " + userId));
		user.setEnabled(true); // Activer le compte
		userRep.save(user);
	}

	/**
	 * Envoie un email contenant le code de validation à l'utilisateur nouvellement
	 * inscrit Design professionnel avec CSS responsive et formatage HTML
	 * 
	 * @param user L'utilisateur destinataire
	 * @param code Le code de validation à envoyer
	 */

	@Override
	public void sendEmailUser(User user, String code) {
		String subject = "🔐 Votre code de validation - Confirmation de compte";

		Map<String, Object> variables = new HashMap<>();
		variables.put("username", user.getUsername());
		variables.put("code", code);

		emailService.sendEmail(user.getEmail(), subject, "email/verification-email", variables);
	}

	/**
	 * Envoie une invitation à un installateur potentiel pour rejoindre la
	 * plateforme Design professionnel avec brand identity et CTA prominent
	 * 
	 * @param email L'adresse email du destinataire
	 */
	@Override
	public void sendInstallerInvitation(String email) {
		String token = UUID.randomUUID().toString();
		String registrationUrl = "http://localhost:4200/installer-register?token=" + token;
		String subject = "🔧 Invitation à rejoindre notre réseau d'installateurs professionnels";

		Map<String, Object> variables = new HashMap<>();
		variables.put("registrationUrl", registrationUrl);

		emailService.sendEmail(email, subject, "email/installer-invitation", variables);
	}

	/**
	 * Envoie un email de récupération de mot de passe avec le code de
	 * réinitialisation
	 * 
	 * @param user      L'utilisateur demandant la réinitialisation
	 * @param resetCode Le code de réinitialisation généré
	 */
	@Override
	public void sendPasswordResetEmail(User user, String resetCode) {
	    String subject = "🔒 Réinitialisation de votre mot de passe - Code de vérification";

	    Map<String, Object> variables = new HashMap<>();
	    variables.put("username", user.getUsername());
	    variables.put("resetCode", resetCode);

	    emailService.sendEmail(
	        user.getEmail(), 
	        subject, 
	        "email/password-reset-email",  // Chemin vers votre template
	        variables
	    );
	}
	/***/
	@Override
	@Transactional
	public boolean validateVerificationToken(User user, String token) {
		VerificationToken verificationToken = verificationTokenRepo.findByToken(token);

		if (verificationToken == null) {
			return false;
		}

		if (!verificationToken.getUser().getUser_id().equals(user.getUser_id())) {
			return false;
		}

		if (verificationToken.isExpired()) {
			verificationTokenRepo.delete(verificationToken);
			return false;
		}

		return true;
	}

	@Override
	public void sendWelcomeEmail(User user) {
		String subject = "🎉 Bienvenue sur notre plateforme !";

		Map<String, Object> variables = new HashMap<>();
		variables.put("username", user.getUsername());

		emailService.sendEmail(user.getEmail(), subject, "email/welcome-email", variables);
	}

	@Override
	public User registerInstaller(RegistrationRequest request) {
	    // Vérifier si le nom d'utilisateur existe déjà (avec Optional)
	    userRep.findByUsername(request.getUsername())
	        .ifPresent(u -> {
	            throw new RuntimeException("Ce nom d'utilisateur est déjà utilisé");
	        });

	    // Vérifier si l'email existe déjà (avec Optional)
	    userRep.findByEmailIgnoreCase(request.getEmail().toLowerCase())
	        .ifPresent(u -> {
	            throw new RuntimeException("Cet email est déjà utilisé");
	        });

	    User user = new User();
	    user.setUsername(request.getUsername());
	    user.setPassword(bCryptPasswordEncoder.encode(request.getPassword()));
	    user.setEmail(request.getEmail().toLowerCase()); // Normalisation email
	    user.setFirstName(request.getFirstName());
	    user.setLastName(request.getLastName());
	    user.setPhone(request.getPhone());
	    user.setDefaultAddress(request.getDefaultAddress());
	    user.setEnabled(false);

	    Role installerRole = roleRep.findByRole("INSTALLATEUR")
	            .orElseThrow(() -> new RuntimeException("Role INSTALLATEUR non trouvé"));
	    user.setRoles(Set.of(installerRole));

	    User savedUser = userRep.save(user);

	    // Générer et envoyer le code de vérification
	    String code = this.generateCode();
	    VerificationToken token = new VerificationToken(code, savedUser);
	    verificationTokenRepo.save(token);

	    sendEmailUser(savedUser, code);

	    return savedUser;
	}
}