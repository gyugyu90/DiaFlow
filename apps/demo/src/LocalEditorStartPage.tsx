import { useRef } from "react";
import { Edit3, FilePlus2, FolderOpen } from "lucide-react";
import { DiagramCard } from "./DiagramListPage";
import type { DiagramListItem } from "./useDiagramDocuments";

export function LocalEditorStartPage({
  items,
  onCreate,
  onEdit,
  onExamples,
  onOpen,
  onOpenNative,
  onView,
}: {
  items: DiagramListItem[];
  onCreate: () => void;
  onEdit: (diagramId: string) => void;
  onExamples: () => void;
  onOpen: (file: File) => void;
  onOpenNative?: () => void;
  onView: (diagramId: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <h1>DiaFlow</h1>
          <p>Local editor</p>
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
            onClick={() => {
              if (onOpenNative) onOpenNative();
              else fileInputRef.current?.click();
            }}
          >
            <FolderOpen size={17} aria-hidden="true" />
            <span>Open</span>
          </button>
          <button className="button button-primary" type="button" onClick={onCreate}>
            <FilePlus2 size={17} aria-hidden="true" />
            <span>New diagram</span>
          </button>
          <button className="button button-secondary" type="button" onClick={onExamples}>
            <Edit3 size={17} aria-hidden="true" />
            <span>Examples</span>
          </button>
        </div>
      </header>

      {items.length > 0 ? (
        <section className="diagram-list" aria-label="Local documents">
          {items.map((item) => (
            <DiagramCard
              key={item.id}
              item={item}
              onEdit={() => onEdit(item.id)}
              onView={() => onView(item.id)}
            />
          ))}
        </section>
      ) : (
        <section className="empty-editor-start" aria-label="Local editor start">
          <h2>No local diagrams are open</h2>
        </section>
      )}
    </main>
  );
}
