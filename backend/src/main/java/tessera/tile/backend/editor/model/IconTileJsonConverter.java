package tessera.tile.backend.editor.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class IconTileJsonConverter implements AttributeConverter<IconTileData, String> {

    @Override
    public String convertToDatabaseColumn(IconTileData attribute) {
        return attribute == null ? null : JsonSupport.writeValue(attribute);
    }

    @Override
    public IconTileData convertToEntityAttribute(String dbData) {
        return dbData == null ? null : JsonSupport.readValue(dbData, IconTileData.class);
    }
}
