package tessera.tile.backend.assets;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "asset.storage")
public class AssetStorageProperties {

    private String basePath = "./data/assets";

    public String getBasePath() {
        return basePath;
    }

    public void setBasePath(String basePath) {
        this.basePath = basePath;
    }
}
