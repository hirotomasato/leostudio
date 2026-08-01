import React from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { I18nProvider } from "@/lib/i18n";
import "@/styles/globals.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found");
}

createRoot(container).render(
  <React.StrictMode>
    <I18nProvider>
      <ThemeProvider defaultTheme="dark">
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  </React.StrictMode>
);
