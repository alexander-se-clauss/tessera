package tessera.tile.backend.editor.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class EntryPointJsonConverter implements AttributeConverter<EntryPointData, String> {

    @Override
    public String convertToDatabaseColumn(EntryPointData attribute) {
        return attribute == null ? null : JsonSupport.writeValue(attribute);
    }

    @Override
    public EntryPointData convertToEntityAttribute(String dbData) {
        return dbData == null ? null : JsonSupport.readValue(dbData, EntryPointData.class);
    }
}
