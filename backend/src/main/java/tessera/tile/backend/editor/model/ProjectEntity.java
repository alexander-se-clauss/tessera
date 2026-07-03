package tessera.tile.backend.editor.model;

import tessera.tile.backend.auth.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "project")
public class ProjectEntity extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private UserAccount owner;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Convert(converter = EntryPointJsonConverter.class)
    @Column(name = "entry_point", columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private EntryPointData entryPoint;

    @Convert(converter = PlayerConfigJsonConverter.class)
    @Column(name = "player_config", columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private PlayerConfigData playerConfig;

    @Column(name = "overworld_group_id", nullable = true)
    private Long overworldGroupId;

    public Long getId() { return id; }

    public UserAccount getOwner() { return owner; }
    public void setOwner(UserAccount owner) { this.owner = owner; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public EntryPointData getEntryPoint() { return entryPoint; }
    public void setEntryPoint(EntryPointData entryPoint) { this.entryPoint = entryPoint; }

    public PlayerConfigData getPlayerConfig() { return playerConfig; }
    public void setPlayerConfig(PlayerConfigData playerConfig) { this.playerConfig = playerConfig; }

    public Long getOverworldGroupId() { return overworldGroupId; }
    public void setOverworldGroupId(Long overworldGroupId) { this.overworldGroupId = overworldGroupId; }
}
