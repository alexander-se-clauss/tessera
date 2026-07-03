package tessera.tile.backend.editor.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class MapLayerListJsonConverter implements AttributeConverter<List<MapLayerData>, String> {

    @Override
    public String convertToDatabaseColumn(List<MapLayerData> attribute) {
        return JsonSupport.writeValue(attribute);
    }

    @Override
    public List<MapLayerData> convertToEntityAttribute(String dbData) {
        return dbData == null ? List.of() : JsonSupport.readValue(dbData, JsonSupport.MAP_LAYER_LIST);
    }
}
