import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DiagramScene } from "@interactive-diagram/schema";

export function SceneControls({
  scene,
  sceneIndex,
  sceneCount,
  onPrevious,
  onNext,
}: {
  scene: DiagramScene | null;
  sceneIndex: number;
  sceneCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (!scene || sceneCount === 0) return null;

  return (
    <section className="scene-controls" aria-label="Scene controls">
      <button
        className="icon-button"
        type="button"
        onClick={onPrevious}
        disabled={sceneIndex === 0}
        aria-label="Previous scene"
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <div className="scene-copy">
        <p className="eyebrow">Scene {sceneIndex + 1} / {sceneCount}</p>
        <h3>{scene.title}</h3>
        {scene.description ? <p>{scene.description}</p> : null}
      </div>
      <button
        className="icon-button"
        type="button"
        onClick={onNext}
        disabled={sceneIndex === sceneCount - 1}
        aria-label="Next scene"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}
