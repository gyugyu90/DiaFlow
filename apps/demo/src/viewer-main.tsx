import React from "react";
import { createRoot } from "react-dom/client";
import { SelfHostedViewerPage } from "./SelfHostedViewerPage";
import "@diastream/runtime/styles.css";
import "./styles.css";

createRoot(document.querySelector("#root") as HTMLElement).render(
  <React.StrictMode>
    <SelfHostedViewerPage />
  </React.StrictMode>,
);
