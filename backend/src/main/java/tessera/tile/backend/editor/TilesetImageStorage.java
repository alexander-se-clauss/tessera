package tessera.tile.backend.editor;

import tessera.tile.backend.assets.AssetStorageConfig;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Component;

@Component
public class TilesetImageStorage {

    private final AssetStorageConfig assetStorageConfig;

    public TilesetImageStorage(AssetStorageConfig assetStorageConfig) {
        this.assetStorageConfig = assetStorageConfig;
    }

    public String createBlankImage(Long projectId, int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        return writeImage(projectId, "tileset-" + System.nanoTime() + ".png", image);
    }

    public BufferedImage readOrBlank(String imageUrl, int width, int height) {
        Path path = pathForUrl(imageUrl);
        if (Files.exists(path)) {
            try {
                BufferedImage existing = ImageIO.read(path.toFile());
                if (existing != null) return ensureArgb(existing);
            } catch (IOException ignored) {
                // Fall through to a blank image; callers will rewrite a valid PNG.
            }
        }
        return new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
    }

    public BufferedImage grow(BufferedImage source, int width, int height) {
        BufferedImage argbSource = ensureArgb(source);
        if (argbSource.getWidth() == width && argbSource.getHeight() == height) return argbSource;
        BufferedImage grown = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = grown.createGraphics();
        g.drawImage(argbSource, 0, 0, null);
        g.dispose();
        return grown;
    }

    public String writeImage(Long projectId, String fileName, BufferedImage image) {
        try {
            Path relative = Path.of("projects", String.valueOf(projectId), "tilesets", fileName);
            Path target = assetStorageConfig.ensureBasePath().resolve(relative).normalize();
            Files.createDirectories(target.getParent());
            ImageIO.write(image, "png", target.toFile());
            return "/assets/" + relative.toString().replace('\\', '/');
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to write composed tileset image.", exception);
        }
    }

    private Path pathForUrl(String imageUrl) {
        String relative = imageUrl.startsWith("/assets/") ? imageUrl.substring("/assets/".length()) : imageUrl;
        return assetStorageConfig.ensureBasePath().resolve(relative).normalize();
    }

    private BufferedImage ensureArgb(BufferedImage source) {
        if (source.getType() == BufferedImage.TYPE_INT_ARGB) return source;
        BufferedImage converted = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = converted.createGraphics();
        g.drawImage(source, 0, 0, null);
        g.dispose();
        return converted;
    }
}
