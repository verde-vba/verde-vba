import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import { initI18n } from "./hooks/useLocale";
import App from "./App";

initI18n();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
