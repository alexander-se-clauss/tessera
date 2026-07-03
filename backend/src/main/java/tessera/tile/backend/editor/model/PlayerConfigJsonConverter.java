package tessera.tile.backend.editor.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class PlayerConfigJsonConverter implements AttributeConverter<PlayerConfigData, String> {

    @Override
    public String convertToDatabaseColumn(PlayerConfigData attribute) {
        return attribute == null ? null : JsonSupport.writeValue(attribute);
    }

    @Override
    public PlayerConfigData convertToEntityAttribute(String dbData) {
        return dbData == null ? null : JsonSupport.readValue(dbData, PlayerConfigData.class);
    }
}
