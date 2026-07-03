package tessera.tile.backend.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class BootstrapUserSeeder {

    @Bean
    ApplicationRunner seedDefaultUser(
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.username}") String username,
            @Value("${app.bootstrap.password}") String password
    ) {
        return args -> {
            String normalizedUsername = username.trim().toLowerCase();

            if (userAccountRepository.existsByUsername(normalizedUsername)) {
                return;
            }

            UserAccount account = new UserAccount();
            account.setUsername(normalizedUsername);
            account.setPasswordHash(passwordEncoder.encode(password));
            account.setRole("USER");
            userAccountRepository.save(account);
        };
    }
}
