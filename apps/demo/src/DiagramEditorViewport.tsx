import { useEffect, useRef } from "react";
import {
  createDiagramEditor,
  type DiagramEditorController,
  type DiagramEditorState,
  type InspectorPosition,
} from "@interactive-diagram/editor";
import type { DiagramDocument } from "@interactive-diagram/schema";

export function DiagramEditorViewport({
  className,
  diagram,
  onDiagramChange,
  onReady,
  onSelectedNodeAnchorChange,
  onStateChange,
  sceneId,
}: {
  className?: string;
  diagram: DiagramDocument;
  onDiagramChange: (diagram: DiagramDocument) => void;
  onReady: (editor: DiagramEditorController | null) => void;
  onSelectedNodeAnchorChange: (position: InspectorPosition | null) => void;
  onStateChange: (state: DiagramEditorState) => void;
  sceneId?: string | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<DiagramEditorController | null>(null);
  const callbacksRef = useRef({
    onDiagramChange,
    onReady,
    onSelectedNodeAnchorChange,
    onStateChange,
  });
  callbacksRef.current = {
    onDiagramChange,
    onReady,
    onSelectedNodeAnchorChange,
    onStateChange,
  };

  useEffect(() => {
    if (!rootRef.current) return;

    const editor = createDiagramEditor(rootRef.current, diagram, {
      sceneId,
      onDiagramChange: (nextDiagram) => callbacksRef.current.onDiagramChange(nextDiagram),
      onSelectedNodeAnchorChange: (position) =>
        callbacksRef.current.onSelectedNodeAnchorChange(position),
      onStateChange: (state) => callbacksRef.current.onStateChange(state),
    });
    editorRef.current = editor;
    callbacksRef.current.onReady(editor);

    return () => {
      callbacksRef.current.onReady(null);
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    editorRef.current?.setDiagram(diagram);
  }, [diagram]);

  useEffect(() => {
    editorRef.current?.setScene(sceneId ?? null);
  }, [sceneId]);

  return <div ref={rootRef} className={`diagram-root ${className ?? ""}`} />;
}
