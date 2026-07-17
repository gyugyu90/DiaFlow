import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { EditorEditScope } from "@interactive-diagram/editor";
import type { DiagramScene } from "@interactive-diagram/schema";

type SceneField = "title" | "description";

export function SceneEditorPanel({
  scenes,
  editScope,
  overrideCount,
  selectedSceneId,
  onAdd,
  onCancelEdit,
  onDelete,
  onEditEnd,
  onEditScopeChange,
  onEditStart,
  onMove,
  onSelect,
  onUpdate,
}: {
  scenes: DiagramScene[];
  editScope: EditorEditScope;
  overrideCount: number;
  selectedSceneId: string | null;
  onAdd: () => void;
  onCancelEdit: () => void;
  onDelete: (sceneId: string) => void;
  onEditEnd: () => void;
  onEditScopeChange: (editScope: EditorEditScope) => void;
  onEditStart: () => void;
  onMove: (sceneId: string, targetIndex: number) => void;
  onSelect: (sceneId: string) => void;
  onUpdate: (sceneId: string, patch: Partial<Pick<DiagramScene, "title" | "description">>) => void;
}) {
  const selectedIndex = scenes.findIndex((scene) => scene.id === selectedSceneId);
  const selectedScene = selectedIndex >= 0 ? scenes[selectedIndex] : null;
  const [editingField, setEditingField] = useState<SceneField | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const canceledEditRef = useRef(false);

  useEffect(() => {
    setEditingField(null);
    setDraftTitle(selectedScene?.title ?? "");
    setDraftDescription(selectedScene?.description ?? "");
  }, [selectedScene?.id]);

  useEffect(() => {
    if (editingField) return;
    setDraftTitle(selectedScene?.title ?? "");
    setDraftDescription(selectedScene?.description ?? "");
  }, [editingField, selectedScene?.description, selectedScene?.title]);

  function beginEdit(field: SceneField) {
    if (editingField === field) return;
    canceledEditRef.current = false;
    setEditingField(field);
    onEditStart();
  }

  function finishTitleEdit() {
    if (canceledEditRef.current) {
      canceledEditRef.current = false;
      return;
    }
    if (!selectedScene) return;

    const title = draftTitle.trim() || "Untitled Scene";
    setDraftTitle(title);
    onUpdate(selectedScene.id, { title });
    onEditEnd();
    setEditingField(null);
  }

  function finishDescriptionEdit() {
    if (canceledEditRef.current) {
      canceledEditRef.current = false;
      return;
    }
    onEditEnd();
    setEditingField(null);
  }

  function cancelEdit(target: HTMLInputElement | HTMLTextAreaElement) {
    canceledEditRef.current = true;
    onCancelEdit();
    setEditingField(null);
    target.blur();
  }

  return (
    <section className="scene-editor-panel" aria-labelledby="scene-editor-heading">
      <div className="side-section-heading">
        <h2 id="scene-editor-heading">Scenes</h2>
        <button
          className="icon-button"
          type="button"
          onClick={onAdd}
          aria-label="Add scene"
          title="Add scene"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>

      {scenes.length > 0 ? (
        <>
          <ol className="scene-list">
            {scenes.map((scene, index) => (
              <li key={scene.id}>
                <button
                  className={`scene-list-button ${scene.id === selectedSceneId ? "is-selected" : ""}`}
                  type="button"
                  aria-pressed={scene.id === selectedSceneId}
                  onClick={() => onSelect(scene.id)}
                >
                  <small>{index + 1}</small>
                  <span>{scene.title}</span>
                </button>
              </li>
            ))}
          </ol>

          {selectedScene ? (
            <div className="scene-editor-fields">
              <div className="scene-edit-scope">
                <div className="scene-edit-scope-heading">
                  <span>Edit scope</span>
                  <small>{overrideCount} {overrideCount === 1 ? "override" : "overrides"}</small>
                </div>
                <div className="segmented-control" role="group" aria-label="Edit scope">
                  <button
                    type="button"
                    aria-pressed={editScope === "diagram"}
                    className={editScope === "diagram" ? "is-active" : ""}
                    onClick={() => onEditScopeChange("diagram")}
                  >
                    Diagram
                  </button>
                  <button
                    type="button"
                    aria-pressed={editScope === "scene"}
                    className={editScope === "scene" ? "is-active" : ""}
                    onClick={() => onEditScopeChange("scene")}
                  >
                    Scene
                  </button>
                </div>
              </div>
              <div className="scene-editor-actions">
                <span>Scene {selectedIndex + 1} of {scenes.length}</span>
                <div>
                  <button
                    className="icon-button"
                    type="button"
                    disabled={selectedIndex === 0}
                    onClick={() => onMove(selectedScene.id, selectedIndex - 1)}
                    aria-label={`Move scene ${selectedScene.title} up`}
                    title="Move scene up"
                  >
                    <ChevronUp size={15} aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    disabled={selectedIndex === scenes.length - 1}
                    onClick={() => onMove(selectedScene.id, selectedIndex + 1)}
                    aria-label={`Move scene ${selectedScene.title} down`}
                    title="Move scene down"
                  >
                    <ChevronDown size={15} aria-hidden="true" />
                  </button>
                  <button
                    className="icon-button delete-button"
                    type="button"
                    onClick={() => onDelete(selectedScene.id)}
                    aria-label={`Delete scene ${selectedScene.title}`}
                    title="Delete scene"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <label>
                <span>Title</span>
                <input
                  aria-label="Scene title"
                  type="text"
                  value={draftTitle}
                  onFocus={() => beginEdit("title")}
                  onBlur={finishTitleEdit}
                  onChange={(event) => {
                    const title = event.target.value;
                    setDraftTitle(title);
                    onUpdate(selectedScene.id, { title });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    else if (event.key === "Escape") cancelEdit(event.currentTarget);
                  }}
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  aria-label="Scene description"
                  placeholder="Optional scene context"
                  rows={3}
                  value={draftDescription}
                  onFocus={() => beginEdit("description")}
                  onBlur={finishDescriptionEdit}
                  onChange={(event) => {
                    const description = event.target.value;
                    setDraftDescription(description);
                    onUpdate(selectedScene.id, { description: description || undefined });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") cancelEdit(event.currentTarget);
                    else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.currentTarget.blur();
                    }
                  }}
                />
              </label>
            </div>
          ) : null}
        </>
      ) : (
        <p className="scene-empty-state">No scenes yet</p>
      )}
    </section>
  );
}
