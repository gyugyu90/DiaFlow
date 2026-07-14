import { useRef } from "react";
import { Edit3, Eye, FilePlus2, FolderOpen } from "lucide-react";
import { DiagramThumbnail } from "./DiagramThumbnail";
import type { DiagramListItem } from "./useDiagramDocuments";

export function DiagramListPage({
  items,
  onCreate,
  onEdit,
  onOpen,
  onView,
}: {
  items: DiagramListItem[];
  onCreate: () => void;
  onEdit: (diagramId: string) => void;
  onOpen: (file: File) => void;
  onView: (diagramId: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <h1>DiaFlow</h1>
          <p>Interactive diagrams</p>
        </div>
        <div className="toolbar">
          <input
            ref={fileInputRef}
            className="file-input"
            type="file"
            accept=".json,.diagram.json,application/json"
            aria-label="Open diagram file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onOpen(file);
            }}
          />
          <button
            className="button button-secondary"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen size={17} aria-hidden="true" />
            <span>Open</span>
          </button>
          <button className="button button-primary" type="button" onClick={onCreate}>
            <FilePlus2 size={17} aria-hidden="true" />
            <span>New diagram</span>
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

function DiagramCard({
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
