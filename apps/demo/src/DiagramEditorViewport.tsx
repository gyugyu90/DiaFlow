import { useEffect, useRef } from "react";
import {
  createDiagramEditor,
  type DiagramEditorController,
  type DiagramEditorState,
  type EditorEditScope,
  type InspectorPosition,
} from "@interactive-diagram/editor";
import type { DiagramDocument } from "@interactive-diagram/schema";

export function DiagramEditorViewport({
  className,
  diagram,
  editScope,
  onDiagramChange,
  onReady,
  onSelectionAnchorChange,
  onStateChange,
  sceneId,
}: {
  className?: string;
  diagram: DiagramDocument;
  editScope: EditorEditScope;
  onDiagramChange: (diagram: DiagramDocument) => void;
  onReady: (editor: DiagramEditorController | null) => void;
  onSelectionAnchorChange: (position: InspectorPosition | null) => void;
  onStateChange: (state: DiagramEditorState) => void;
  sceneId?: string | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<DiagramEditorController | null>(null);
  const callbacksRef = useRef({
    onDiagramChange,
    onReady,
    onSelectionAnchorChange,
    onStateChange,
  });
  callbacksRef.current = {
    onDiagramChange,
    onReady,
    onSelectionAnchorChange,
    onStateChange,
  };

  useEffect(() => {
    if (!rootRef.current) return;

    const editor = createDiagramEditor(rootRef.current, diagram, {
      editScope,
      sceneId,
      onDiagramChange: (nextDiagram) => callbacksRef.current.onDiagramChange(nextDiagram),
      onSelectionAnchorChange: (position) =>
        callbacksRef.current.onSelectionAnchorChange(position),
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

  useEffect(() => {
    editorRef.current?.setEditScope(editScope);
  }, [editScope]);

  return <div ref={rootRef} className={`diagram-root ${className ?? ""}`} />;
}
