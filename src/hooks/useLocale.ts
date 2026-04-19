import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "../locales/en.json";
import ja from "../locales/ja.json";

function detectLanguage(preferred: string): string {
  if (preferred !== "auto") return preferred;
  const lang = navigator.language;
  if (lang.startsWith("ja")) return "ja";
  return "en";
}

let initialized = false;

export function initI18n(language: string = "auto") {
  if (initialized) return;
  initialized = true;

  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
    },
    lng: detectLanguage(language),
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });
}

export function changeLanguage(language: string) {
  const lng = detectLanguage(language);
  i18n.changeLanguage(lng);
}
