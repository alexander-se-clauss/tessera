package tessera.tile.backend.editor.model;

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class TileRefListJsonConverter implements AttributeConverter<List<TileRefData>, String> {

    private static final TypeReference<List<TileRefData>> TYPE = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<TileRefData> attribute) {
        return JsonSupport.writeValue(attribute);
    }

    @Override
    public List<TileRefData> convertToEntityAttribute(String dbData) {
        return dbData == null ? List.of() : JsonSupport.readValue(dbData, TYPE);
    }
}
