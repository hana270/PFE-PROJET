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
import projet.spring.service.exceptions.EmailAlreadyExistsException;
import projet.spring.service.exceptions.ExpiredTokenException;
import projet.spring.service.exceptions.InvalidTokenException;
import projet.spring.service.register.RegistrationRequest;
import projet.spring.service.register.VerificationToken;
import projet.spring.service.register.VerificationTokenRepository;
import projet.spring.util.EmailSender;

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

	@Autowired
	public UserServiceImpl(UserRepository userRep, RoleRepository roleRep, BCryptPasswordEncoder bCryptPasswordEncoder,
			VerificationTokenRepository verificationTokenRepo, EmailSender emailSender) {
		this.userRep = userRep;
		this.roleRep = roleRep;
		this.bCryptPasswordEncoder = bCryptPasswordEncoder;
		this.verificationTokenRepo = verificationTokenRepo;
		this.emailSender = emailSender;
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
		User usr = userRep.findByUsername(username);
		if (usr == null) {
			throw new RuntimeException("User not found: " + username);
		}

		Optional<Role> roleOptional = roleRep.findByRole(rolename);
		if (roleOptional.isEmpty()) {
			throw new RuntimeException("Role not found: " + rolename);
		}

		Role r = roleOptional.get();
		usr.getRoles().add(r);
		return usr;
	}

	@Override
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
	public User findUserByUsername(String username) {
		User user = userRep.findByUsername(username);
		if (user != null) {
			System.out.println("User found: " + user.getUsername());
			System.out.println("User roles: " + user.getRoles());
		} else {
			System.out.println("User not found: " + username);
		}
		return user;
	}

	@Override
	public User registerUser(RegistrationRequest request) {
		Optional<User> optionalUser = userRep.findByEmail(request.getEmail());
		if (optionalUser.isPresent()) {
			throw new EmailAlreadyExistsException("Email déjà existant!");
		}

		User newUser = new User();
		newUser.setUsername(request.getUsername());
		newUser.setEmail(request.getEmail());
		newUser.setPassword(bCryptPasswordEncoder.encode(request.getPassword()));
		newUser.setEnabled(false); // User is not enabled until email is verified

		Optional<Role> clientRoleOptional = roleRep.findByRole("CLIENT");
		if (clientRoleOptional.isEmpty()) {
			throw new RuntimeException("Role CLIENT not found!");
		}
		Role clientRole = clientRoleOptional.get();

		Set<Role> roles = new HashSet<>();
		roles.add(clientRole);
		newUser.setRoles(roles);

		userRep.save(newUser);

		String code = this.generateCode();
		VerificationToken token = new VerificationToken(code, newUser);
		verificationTokenRepo.save(token);

		sendEmailUser(newUser, token.getToken());

		return newUser;
	}

	private String generateCode() {
		Random random = new Random();
		Integer code = 100000 + random.nextInt(900000);
		return code.toString();
	}

	@Override
	public void sendEmailUser(User u, String code) {
		String emailBody = "Bonjour" + "<h1>" + u.getUsername() + code + "</h1>";

		emailSender.sendEmail(u.getEmail(), emailBody);
	}

	@Override
	public User validateToken(String code) {
		VerificationToken token = verificationTokenRepo.findByToken(code);
		if (token == null) {
			throw new InvalidTokenException("Invalid Token !!!!!!!");
		}

		User user = token.getUser();
		Calendar calendar = Calendar.getInstance();

		if ((token.getExpirationTime().getTime() - calendar.getTime().getTime()) <= 0) {
			verificationTokenRepo.delete(token);
			throw new ExpiredTokenException("expired Token");
		}
		user.setEnabled(true);
		userRep.save(user);
		return user;
	}

	@Override
	public boolean updateUserProfile(String username, String newEmail, String newPassword, String currentPassword,
	        String profileImagePath) {
	    User user = userRep.findByUsername(username);
	    if (user == null) {
	        throw new RuntimeException("Utilisateur non trouvé");
	    }

	    // Vérification du mot de passe actuel uniquement si newEmail ou newPassword est fourni
	    if ((newEmail != null && !newEmail.isEmpty()) || (newPassword != null && !newPassword.isEmpty())) {
	        if (currentPassword == null || currentPassword.isEmpty()) {
	            throw new RuntimeException("Le mot de passe actuel est requis pour effectuer des modifications");
	        }
	        if (!bCryptPasswordEncoder.matches(currentPassword, user.getPassword())) {
	            throw new RuntimeException("Mot de passe actuel incorrect");
	        }
	    }

	    // Mise à jour de l'email
	    if (newEmail != null && !newEmail.isEmpty()) {
	        Optional<User> userWithEmail = userRep.findByEmail(newEmail);
	        if (userWithEmail.isPresent() && !userWithEmail.get().getUsername().equals(username)) {
	            throw new EmailAlreadyExistsException("Cet email est déjà utilisé");
	        }
	        user.setEmail(newEmail);
	    }

	    // Mise à jour du mot de passe
	    if (newPassword != null && !newPassword.isEmpty()) {
	        user.setPassword(bCryptPasswordEncoder.encode(newPassword));
	    }

	    // Mise à jour de l'image de profil
	    if (profileImagePath != null && !profileImagePath.isEmpty()) {
	        user.setProfileImage(profileImagePath); // Stockez uniquement le nom du fichier
	    }
	    userRep.save(user);
	    return true;
	}
	
	@Override
	public void sendInstallerInvitation(String email) {
		String token = UUID.randomUUID().toString();
		String registrationUrl = "http://localhost:4200/installer-register?token=" + token;
		String emailContent = "Cliquez sur ce lien pour vous inscrire : " + registrationUrl;
		emailSender.sendEmail(email, emailContent);
	}

	@Override
	public User registerInstaller(RegistrationRequest request) {
		User user = new User();
		user.setUsername(request.getUsername());
		user.setPassword(bCryptPasswordEncoder.encode(request.getPassword()));
		user.setEmail(request.getEmail());
		user.setEnabled(true);

		Role installerRole = roleRep.findByRole("INSTALLATEUR")
				.orElseThrow(() -> new RuntimeException("Role INSTALLATEUR not found"));
		user.setRoles(Set.of(installerRole));

		return userRep.save(user);
	}

	@Override
	public User findUserByEmail(String email) {
		Optional<User> user = userRep.findByEmail(email);
		return user.orElse(null);
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
		int code = 1000 + random.nextInt(9000);
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
}