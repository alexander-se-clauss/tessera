package tessera.tile.backend.editor.model;

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class SourceOccurrenceListJsonConverter implements AttributeConverter<List<SourceOccurrenceData>, String> {

    private static final TypeReference<List<SourceOccurrenceData>> TYPE = new TypeReference<>() {
    };

    @Override
    public String convertToDatabaseColumn(List<SourceOccurrenceData> attribute) {
        return JsonSupport.writeValue(attribute);
    }

    @Override
    public List<SourceOccurrenceData> convertToEntityAttribute(String dbData) {
        return dbData == null ? List.of() : JsonSupport.readValue(dbData, TYPE);
    }
}
