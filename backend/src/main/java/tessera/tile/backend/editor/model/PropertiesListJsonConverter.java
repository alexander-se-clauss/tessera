package tessera.tile.backend.editor.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;
import java.util.Map;

@Converter
public class PropertiesListJsonConverter implements AttributeConverter<List<Map<String, Object>>, String> {

    @Override
    public String convertToDatabaseColumn(List<Map<String, Object>> attribute) {
        return JsonSupport.writeValue(attribute == null ? List.of() : attribute);
    }

    @Override
    public List<Map<String, Object>> convertToEntityAttribute(String dbData) {
        return dbData == null ? List.of() : JsonSupport.readValue(dbData, JsonSupport.PROPERTIES_LIST);
    }
}
