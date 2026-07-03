package tessera.tile.backend.editor.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class SpawnPointJsonConverter implements AttributeConverter<SpawnPointData, String> {

    @Override
    public String convertToDatabaseColumn(SpawnPointData attribute) {
        return attribute == null ? null : JsonSupport.writeValue(attribute);
    }

    @Override
    public SpawnPointData convertToEntityAttribute(String dbData) {
        return dbData == null ? null : JsonSupport.readValue(dbData, SpawnPointData.class);
    }
}
