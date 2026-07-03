package tessera.tile.backend.editor.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum MapEventType {
    NPC("npc"),
    DOOR("door"),
    WARP("warp"),
    TELEPORT("teleport"),
    TRIGGER("trigger"),
    CHECKPOINT("checkpoint"),
    ITEM("item"),
    SCRIPT("script"),
    CUSTOM("custom");

    private final String value;

    MapEventType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static MapEventType fromValue(String value) {
        for (MapEventType type : values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }

        throw new IllegalArgumentException("Unknown event type: " + value);
    }
}
