package tessera.tile.backend.editor.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class MapObjectListJsonConverter implements AttributeConverter<List<MapObjectData>, String> {

    @Override
    public String convertToDatabaseColumn(List<MapObjectData> attribute) {
        return JsonSupport.writeValue(attribute == null ? List.of() : attribute);
    }

    @Override
    public List<MapObjectData> convertToEntityAttribute(String dbData) {
        return dbData == null ? List.of() : JsonSupport.readValue(dbData, JsonSupport.MAP_OBJECT_LIST);
    }
}
