import { useEffect, useMemo, useState } from "react";
import { BuildVersionBadge, FileErrorBanner } from "./AppStatus";
import { DiagramListPage } from "./DiagramListPage";
import { DiagramViewModal } from "./DiagramViewModal";
import { EditorPage } from "./editor/EditorPage";
import { editRoute, listRoute } from "./routes";
import { useAppRoute } from "./useAppRoute";
import { useDiagramDocuments } from "./useDiagramDocuments";

export function App() {
  const {
    items,
    fileError,
    clearFileError,
    createDocument,
    openDocument,
    saveDocument,
    updateDocument,
  } = useDiagramDocuments();
  const { route, navigate } = useAppRoute();
  const [viewingDiagramId, setViewingDiagramId] = useState<string | null>(null);
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

  return (
    <>
      {selectedDiagram ? (
        <EditorPage
          item={selectedDiagram}
          onBack={() => navigate(listRoute)}
          onSave={() => saveDocument(selectedDiagram)}
          onView={() => setViewingDiagramId(selectedDiagram.id)}
          onDiagramChange={(diagram) => updateDocument(selectedDiagram.id, diagram)}
        />
      ) : (
        <DiagramListPage
          items={items}
          onCreate={createNewDiagram}
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
