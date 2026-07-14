import { useEffect, useState } from "react";
import type { DiagramListItem } from "../useDiagramDocuments";

type MetadataField = "title" | "description";

export function EditorDocumentHeading({
  item,
  onCancelEdit,
  onDescriptionChange,
  onEditEnd,
  onEditStart,
  onTitleChange,
}: {
  item: DiagramListItem;
  onCancelEdit: () => void;
  onDescriptionChange: (description: string | undefined) => void;
  onEditEnd: () => void;
  onEditStart: () => void;
  onTitleChange: (title: string) => void;
}) {
  const [editingField, setEditingField] = useState<MetadataField | null>(null);

  useEffect(() => {
    setEditingField(null);
  }, [item.id]);

  function beginEdit(field: MetadataField) {
    onEditStart();
    setEditingField(field);
  }

  function finishTitleEdit(value: string) {
    onTitleChange(value.trim() || "Untitled Diagram");
    onEditEnd();
    setEditingField(null);
  }

  function finishDescriptionEdit() {
    onEditEnd();
    setEditingField(null);
  }

  function cancelEdit() {
    onCancelEdit();
    setEditingField(null);
  }

  return (
    <div className="editor-document-heading">
      <p className="eyebrow">Edit</p>
      {editingField === "title" ? (
        <>
          <h1 className="visually-hidden" aria-label={item.title}>{item.title}</h1>
          <input
            autoFocus
            className="editor-title-input"
            aria-label="Diagram title"
            required
            type="text"
            value={item.diagram.metadata.title}
            onBlur={(event) => finishTitleEdit(event.currentTarget.value)}
            onChange={(event) => onTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                event.preventDefault();
                cancelEdit();
              }
            }}
          />
        </>
      ) : (
        <h1 className="editor-title-heading" aria-label={item.title}>
          <button
            className="inline-metadata-display editor-title-display"
            type="button"
            aria-label="Edit diagram title"
            onClick={() => beginEdit("title")}
          >
            {item.title}
          </button>
        </h1>
      )}
      {editingField === "description" ? (
        <textarea
          autoFocus
          className="editor-description-input"
          aria-label="Diagram description"
          placeholder="Tell us what this diagram is about"
          rows={2}
          value={item.diagram.metadata.description ?? ""}
          onBlur={finishDescriptionEdit}
          onChange={(event) => onDescriptionChange(event.target.value || undefined)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              cancelEdit();
            } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
      ) : (
        <button
          className={`inline-metadata-display editor-description-display ${item.description ? "" : "is-placeholder"}`}
          type="button"
          aria-label="Edit diagram description"
          onClick={() => beginEdit("description")}
        >
          {item.description || "Tell us what this diagram is about"}
        </button>
      )}
      <p className="document-file-status" aria-live="polite">
        <span>{item.fileName}</span>
        <strong className={item.isDirty ? "is-dirty" : ""}>
          {item.isDirty ? "Unsaved changes" : "Saved"}
        </strong>
      </p>
    </div>
  );
}
