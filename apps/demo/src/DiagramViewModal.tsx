import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { DiagramViewport } from "./DiagramViewport";
import { SceneControls } from "./SceneControls";
import type { DiagramListItem } from "./useDiagramDocuments";

export function DiagramViewModal({
  item,
  onClose,
}: {
  item: DiagramListItem;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const scenes = item.diagram.scenes ?? [];
  const [sceneIndex, setSceneIndex] = useState(0);
  const scene = scenes[sceneIndex] ?? null;

  useEffect(() => {
    setSceneIndex(0);
  }, [item.id]);

  async function enterFullscreen() {
    await modalRef.current?.requestFullscreen?.();
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${item.title} viewer`}>
      <section className="viewer-modal" ref={modalRef}>
        <header className="viewer-header">
          <div>
            <p className="eyebrow">View</p>
            <h2>{item.title}</h2>
          </div>
          <div className="toolbar">
            <button className="icon-button" type="button" onClick={enterFullscreen} aria-label="Enter fullscreen">
              <Maximize2 size={18} aria-hidden="true" />
            </button>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close viewer">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>
        <SceneControls
          scene={scene}
          sceneIndex={sceneIndex}
          sceneCount={scenes.length}
          onPrevious={() => setSceneIndex((index) => Math.max(0, index - 1))}
          onNext={() => setSceneIndex((index) => Math.min(scenes.length - 1, index + 1))}
        />
        <DiagramViewport diagram={item.diagram} sceneId={scene?.id ?? null} className="viewer-diagram-root" />
      </section>
    </div>
  );
}
