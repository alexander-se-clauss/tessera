package tessera.tile.backend.editor.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum TileType {
    FLOOR("floor"),
    WALL("wall"),
    WATER("water"),
    OBJECT("object");

    private final String value;

    TileType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static TileType fromValue(String value) {
        for (TileType type : values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }
        return FLOOR;
    }

    public boolean defaultSolid() {
        return this == WALL;
    }
}
