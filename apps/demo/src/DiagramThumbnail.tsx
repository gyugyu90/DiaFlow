import { useEffect, useMemo, useRef } from "react";
import { renderDiagram } from "@interactive-diagram/runtime";
import type { DiagramDocument } from "@interactive-diagram/schema";
import { getDiagramThumbnailViewBox } from "./diagram-thumbnail";

export function DiagramThumbnail({ diagram }: { diagram: DiagramDocument }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sceneId = diagram.scenes?.[0]?.id ?? null;
  const viewBox = useMemo(() => getDiagramThumbnailViewBox(diagram), [diagram]);

  useEffect(() => {
    if (!rootRef.current) return;

    const renderer = renderDiagram(rootRef.current, diagram, {
      animations: false,
      interactive: false,
      sceneId,
      viewBox,
    });
    return () => renderer.destroy();
  }, [diagram, sceneId, viewBox]);

  return (
    <div
      ref={rootRef}
      className="diagram-root diagram-card-thumbnail"
      aria-hidden="true"
    />
  );
}
