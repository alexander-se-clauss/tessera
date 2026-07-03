package tessera.tile.backend.editor.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MapGroupType {
    WORLD("world"),
    DUNGEON("dungeon"),
    AREA("area");

    private final String value;

    MapGroupType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static MapGroupType fromValue(String value) {
        if (value == null) return WORLD;
        for (MapGroupType t : values()) {
            if (t.value.equalsIgnoreCase(value)) return t;
        }
        return WORLD;
    }
}
