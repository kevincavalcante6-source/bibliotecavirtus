import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "@/App";
import { AuthProvider } from "@/auth/AuthProvider";
import { FavoritesProvider } from "@/hooks/useFavorites";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { DemoBanner } from "@/demo/DemoBanner";

import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";
import "@/demo/demo.css";

/**
 * Entrada do MODO DEMONSTRAÇÃO. Usa as mesmas páginas e componentes da
 * aplicação; o `vite.config.ts`, no modo `demo`, troca apenas a camada de
 * serviços e a autenticação por versões locais. Rotas por hash porque o
 * artefato serve arquivos estáticos, sem reescrita de URL no servidor.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <FavoritesProvider>
            <DemoBanner />
            <App />
          </FavoritesProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  </StrictMode>,
);
