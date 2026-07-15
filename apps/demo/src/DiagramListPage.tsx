import { Edit3, Eye, Home } from "lucide-react";
import { DiagramThumbnail } from "./DiagramThumbnail";
import type { DiagramListItem } from "./useDiagramDocuments";

export function DiagramListPage({
  items,
  onEdit,
  onHome,
  onView,
}: {
  items: DiagramListItem[];
  onEdit: (diagramId: string) => void;
  onHome: () => void;
  onView: (diagramId: string) => void;
}) {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <h1>Examples</h1>
          <p>Sample diagrams</p>
        </div>
        <div className="toolbar">
          <button className="button button-secondary" type="button" onClick={onHome}>
            <Home size={17} aria-hidden="true" />
            <span>Local editor</span>
          </button>
        </div>
      </header>

      <section className="diagram-list" aria-label="Diagram list">
        {items.map((item) => (
          <DiagramCard
            key={item.id}
            item={item}
            onEdit={() => onEdit(item.id)}
            onView={() => onView(item.id)}
          />
        ))}
      </section>
    </main>
  );
}

export function DiagramCard({
  item,
  onEdit,
  onView,
}: {
  item: DiagramListItem;
  onEdit: () => void;
  onView: () => void;
}) {
  return (
    <article className="diagram-card">
      <div className="diagram-card-main">
        <h2>{item.title}</h2>
        {item.description ? <p className="diagram-card-description">{item.description}</p> : null}
        <p className="document-file-status">
          <span>{item.fileName}</span>
          {item.isDirty ? <strong>Unsaved changes</strong> : null}
        </p>
      </div>
      <DiagramThumbnail diagram={item.diagram} />
      <div className="card-actions">
        <button className="button button-secondary" type="button" onClick={onView}>
          <Eye size={17} aria-hidden="true" />
          <span>View</span>
        </button>
        <button className="button button-primary" type="button" onClick={onEdit}>
          <Edit3 size={17} aria-hidden="true" />
          <span>Edit</span>
        </button>
      </div>
    </article>
  );
}
