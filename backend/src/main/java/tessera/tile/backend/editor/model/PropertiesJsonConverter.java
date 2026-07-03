package tessera.tile.backend.editor.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.Map;

@Converter
public class PropertiesJsonConverter implements AttributeConverter<Map<String, Object>, String> {

    @Override
    public String convertToDatabaseColumn(Map<String, Object> attribute) {
        return JsonSupport.writeValue(attribute);
    }

    @Override
    public Map<String, Object> convertToEntityAttribute(String dbData) {
        return dbData == null ? Map.of() : JsonSupport.readValue(dbData, JsonSupport.PROPERTIES_MAP);
    }
}
