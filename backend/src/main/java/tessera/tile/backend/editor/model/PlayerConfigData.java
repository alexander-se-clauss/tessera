package tessera.tile.backend.editor.model;

public record PlayerConfigData(
        Long spriteId,
        double moveSpeed,
        CollisionBoxData collisionBox,
        MirrorMovementsData mirrorMovements
) {
}
