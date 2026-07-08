import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { renderDiagram, type DiagramRenderer } from "@interactive-diagram/runtime";
import { parseDiagramDocument } from "@interactive-diagram/schema";
import sampleDiagram from "../../../examples/basic-web-architecture.diagram.json";
import "./styles.css";

function App() {
  const diagram = useMemo(() => parseDiagramDocument(sampleDiagram), []);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<DiagramRenderer | null>(null);
  const [animations, setAnimations] = useState(true);
  const [labels, setLabels] = useState(true);

  useEffect(() => {
    if (!rootRef.current) return;

    rendererRef.current = renderDiagram(rootRef.current, diagram, {
      animations,
      labels,
    });

    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [diagram]);

  useEffect(() => {
    rendererRef.current?.setOptions({ animations, labels });
  }, [animations, labels]);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Diagram JSON Renderer</p>
          <h1>{diagram.metadata.title}</h1>
        </div>
        <div className="toolbar" aria-label="Diagram controls">
          <label className="toggle">
            <input
              checked={animations}
              onChange={(event) => setAnimations(event.target.checked)}
              type="checkbox"
            />
            <span>Animation</span>
          </label>
          <label className="toggle">
            <input
              checked={labels}
              onChange={(event) => setLabels(event.target.checked)}
              type="checkbox"
            />
            <span>Labels</span>
          </label>
        </div>
      </header>

      <section className="workspace" aria-label="Diagram canvas">
        <div ref={rootRef} className="diagram-root" />
      </section>

      <footer className="statusbar">
        <span>{`${diagram.kind} / ${diagram.schemaVersion} / sample diagram`}</span>
        <span>
          {`${diagram.nodes.length} nodes, ${diagram.edges.length} edges, ${diagram.animations?.length ?? 0} animations`}
        </span>
      </footer>
    </main>
  );
}

createRoot(document.querySelector("#root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
