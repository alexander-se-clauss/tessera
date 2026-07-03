package tessera.tile.backend.editor.model;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import java.util.List;
import java.util.Map;

final class JsonSupport {

    static final ObjectMapper OBJECT_MAPPER = JsonMapper.builder().findAndAddModules().build();
    static final TypeReference<List<MapLayerData>> MAP_LAYER_LIST = new TypeReference<>() {
    };
    static final TypeReference<List<MapObjectData>> MAP_OBJECT_LIST = new TypeReference<>() {
    };
    static final TypeReference<Map<String, Object>> PROPERTIES_MAP = new TypeReference<>() {
    };
    static final TypeReference<List<Map<String, Object>>> PROPERTIES_LIST = new TypeReference<>() {
    };

    private JsonSupport() {
    }

    static String writeValue(Object value) {
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to serialize editor JSON.", exception);
        }
    }

    static <T> T readValue(String value, TypeReference<T> typeReference) {
        try {
            return OBJECT_MAPPER.readValue(value, typeReference);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to deserialize editor JSON.", exception);
        }
    }

    static <T> T readValue(String value, Class<T> clazz) {
        try {
            return OBJECT_MAPPER.readValue(value, clazz);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Failed to deserialize editor JSON.", exception);
        }
    }
}
