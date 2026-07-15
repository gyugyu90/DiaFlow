import { useEffect, useRef } from "react";
import { renderDiagram, type DiagramRenderer } from "@interactive-diagram/runtime";
import type { DiagramDocument } from "@interactive-diagram/schema";

export function DiagramViewport({
  animations,
  className,
  diagram,
  interactive,
  sceneId,
}: {
  animations?: boolean;
  className?: string;
  diagram: DiagramDocument;
  interactive?: boolean;
  sceneId?: string | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<DiagramRenderer | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    rendererRef.current = renderDiagram(rootRef.current, diagram, {
      animations,
      interactive,
      sceneId,
    });
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

  useEffect(() => {
    rendererRef.current?.setOptions({ animations, interactive });
  }, [animations, interactive]);

  return <div ref={rootRef} className={`diagram-root ${className ?? ""}`} />;
}
