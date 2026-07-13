import { useEffect, useRef } from "react";
import { renderDiagram, type DiagramRenderer } from "@interactive-diagram/runtime";
import type { DiagramDocument } from "@interactive-diagram/schema";

export function DiagramViewport({
  className,
  diagram,
  sceneId,
}: {
  className?: string;
  diagram: DiagramDocument;
  sceneId?: string | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<DiagramRenderer | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    rendererRef.current = renderDiagram(rootRef.current, diagram, { sceneId });
    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setDiagram(diagram);
  }, [diagram]);

  useEffect(() => {
    rendererRef.current?.setOptions({ sceneId });
  }, [sceneId]);

  return <div ref={rootRef} className={`diagram-root ${className ?? ""}`} />;
}
