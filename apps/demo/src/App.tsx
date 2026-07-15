import { useEffect, useMemo, useState } from "react";
import { BuildVersionBadge, FileErrorBanner } from "./AppStatus";
import { DiagramListPage } from "./DiagramListPage";
import { DiagramViewModal } from "./DiagramViewModal";
import { LocalEditorStartPage } from "./LocalEditorStartPage";
import { EditorPage } from "./editor/EditorPage";
import { editRoute, galleryRoute, listRoute } from "./routes";
import { useAppRoute } from "./useAppRoute";
import { useDiagramDocuments } from "./useDiagramDocuments";

export function App() {
  const {
    items,
    canOpenNativeFiles,
    fileError,
    clearFileError,
    createDocument,
    openDocument,
    openDocumentFromPicker,
    saveDocument,
    updateDocument,
  } = useDiagramDocuments();
  const { route, navigate } = useAppRoute();
  const [viewingDiagramId, setViewingDiagramId] = useState<string | null>(null);
  const localItems = useMemo(() => items.filter((item) => item.source === "local"), [items]);
  const sampleItems = useMemo(() => items.filter((item) => item.source === "sample"), [items]);
  const selectedDiagram = useMemo(() => route.view === "edit"
    ? items.find((item) => item.id === route.diagramId) ?? null
    : null, [items, route]);
  const viewingDiagram = viewingDiagramId
    ? items.find((item) => item.id === viewingDiagramId) ?? null
    : null;

  useEffect(() => {
    setViewingDiagramId(null);
  }, [route]);

  useEffect(() => {
    if (route.view === "edit" && !selectedDiagram) {
      navigate(listRoute, true);
    }
  }, [navigate, route, selectedDiagram]);

  function createNewDiagram() {
    const item = createDocument();
    navigate(editRoute(item.id));
  }

  async function openDiagramFile(file: File) {
    const item = await openDocument(file);
    if (item) navigate(editRoute(item.id));
  }

  async function openDiagramWithNativePicker() {
    const item = await openDocumentFromPicker();
    if (item) navigate(editRoute(item.id));
  }

  return (
    <>
      {selectedDiagram ? (
        <EditorPage
          item={selectedDiagram}
          onBack={() => navigate(selectedDiagram.source === "sample" ? galleryRoute : listRoute)}
          onSave={() => void saveDocument(selectedDiagram)}
          onView={() => setViewingDiagramId(selectedDiagram.id)}
          onDiagramChange={(diagram) => updateDocument(selectedDiagram.id, diagram)}
        />
      ) : route.view === "gallery" ? (
        <DiagramListPage
          items={sampleItems}
          onHome={() => navigate(listRoute)}
          onEdit={(diagramId) => navigate(editRoute(diagramId))}
          onView={setViewingDiagramId}
        />
      ) : (
        <LocalEditorStartPage
          items={localItems}
          onCreate={createNewDiagram}
          onExamples={() => navigate(galleryRoute)}
          onOpenNative={canOpenNativeFiles ? () => void openDiagramWithNativePicker() : undefined}
          onOpen={(file) => void openDiagramFile(file)}
          onEdit={(diagramId) => navigate(editRoute(diagramId))}
          onView={setViewingDiagramId}
        />
      )}
      {fileError ? <FileErrorBanner message={fileError} onDismiss={clearFileError} /> : null}
      {viewingDiagram ? (
        <DiagramViewModal
          item={viewingDiagram}
          onClose={() => setViewingDiagramId(null)}
        />
      ) : null}
      <BuildVersionBadge />
    </>
  );
}
