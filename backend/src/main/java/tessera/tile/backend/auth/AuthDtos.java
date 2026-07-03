package tessera.tile.backend.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record AuthRequest(
            @NotBlank @Size(min = 3, max = 64) String username,
            @NotBlank @Size(min = 6, max = 128) String password
    ) {
    }

    public record AuthResponse(String token, UserView user) {
    }

    public record UserView(Long id, String username, String role, Instant createdAt) {
    }

    public record ErrorResponse(String message) {
    }
}
