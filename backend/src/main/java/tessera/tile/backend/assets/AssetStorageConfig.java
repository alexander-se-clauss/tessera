package tessera.tile.backend.assets;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableConfigurationProperties(AssetStorageProperties.class)
public class AssetStorageConfig implements WebMvcConfigurer {

    private final AssetStorageProperties properties;

    public AssetStorageConfig(AssetStorageProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path basePath = ensureBasePath();
        registry.addResourceHandler("/assets/**")
                .addResourceLocations(basePath.toUri().toString());
    }

    public Path ensureBasePath() {
        try {
            Path basePath = Paths.get(properties.getBasePath()).toAbsolutePath().normalize();
            Files.createDirectories(basePath);
            return basePath;
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to initialize asset storage path.", exception);
        }
    }
}
