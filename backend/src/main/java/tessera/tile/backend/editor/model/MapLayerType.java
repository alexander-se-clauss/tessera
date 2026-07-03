package tessera.tile.backend.editor.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MapLayerType {
    BACKGROUND("background"),
    FOREGROUND("foreground"),
    OBJECT("object"),
    COLLISION("collision"),
    EVENT("event");

    private final String value;

    MapLayerType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static MapLayerType fromValue(String value) {
        for (MapLayerType type : values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }

        throw new IllegalArgumentException("Unknown layer type: " + value);
    }
}
