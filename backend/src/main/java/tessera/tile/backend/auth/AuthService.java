package tessera.tile.backend.auth;

import tessera.tile.backend.auth.AuthDtos.AuthRequest;
import tessera.tile.backend.auth.AuthDtos.AuthResponse;
import tessera.tile.backend.auth.AuthDtos.UserView;
import tessera.tile.backend.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(AuthRequest request) {
        String username = normalizeUsername(request.username());

        if (userAccountRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username is already taken.");
        }

        UserAccount account = new UserAccount();
        account.setUsername(username);
        account.setPasswordHash(passwordEncoder.encode(request.password()));
        account.setRole("USER");

        UserAccount saved = userAccountRepository.save(account);
        String token = jwtService.generateToken(saved.getUsername(), saved.getRole());

        return new AuthResponse(token, toUserView(saved));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest request) {
        String username = normalizeUsername(request.username());

        authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(username, request.password())
        );

        UserAccount account = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials."));

        String token = jwtService.generateToken(account.getUsername(), account.getRole());
        return new AuthResponse(token, toUserView(account));
    }

    @Transactional(readOnly = true)
    public UserView getUser(String username) {
        UserAccount account = userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User was not found."));

        return toUserView(account);
    }

    private UserView toUserView(UserAccount account) {
        return new UserView(account.getId(), account.getUsername(), account.getRole(), account.getCreatedAt());
    }

    private String normalizeUsername(String username) {
        return username.trim().toLowerCase();
    }
}
