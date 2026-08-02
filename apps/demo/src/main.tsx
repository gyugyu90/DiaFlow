import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@diastream/runtime/styles.css";
import "@diastream/editor/styles.css";
import "./styles.css";

createRoot(document.querySelector("#root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
