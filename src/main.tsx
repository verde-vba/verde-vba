import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import "./styles/global.css";
import { initI18n } from "./hooks/useLocale";
import App from "./App";

// Use locally bundled Monaco instead of the default CDN loader.
// The CDN path races with React StrictMode's mount/unmount cycle,
// causing "operation is manually canceled" and a broken editor.
self.MonacoEnvironment = {
  getWorker: () => new editorWorker(),
};
loader.config({ monaco });

initI18n();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
