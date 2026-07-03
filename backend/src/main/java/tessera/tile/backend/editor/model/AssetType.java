package tessera.tile.backend.editor.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AssetType {
    ENVIRONMENT("environment"),
    CHARACTER("character");

    private final String value;

    AssetType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static AssetType fromValue(String value) {
        for (AssetType type : values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }

        throw new IllegalArgumentException("Unknown asset type: " + value);
    }
}
