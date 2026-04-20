import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import { initI18n } from "./hooks/useLocale";
import App from "./App";

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
