package tessera.tile.backend.editor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "map_groups")
public class MapGroupEntity extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 20)
    private String type = "world";

    @Column(name = "is_overworld", nullable = false)
    private boolean isOverworld = false;

    @Column(name = "min_cols", nullable = false)
    private int minCols = 4;

    @Column(name = "min_rows", nullable = false)
    private int minRows = 4;

    public Long getId() { return id; }

    public ProjectEntity getProject() { return project; }
    public void setProject(ProjectEntity project) { this.project = project; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public boolean isOverworld() { return isOverworld; }
    public void setOverworld(boolean overworld) { isOverworld = overworld; }

    public int getMinCols() { return minCols; }
    public void setMinCols(int minCols) { this.minCols = minCols; }

    public int getMinRows() { return minRows; }
    public void setMinRows(int minRows) { this.minRows = minRows; }
}
