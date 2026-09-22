import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "@/App";
import { AuthProvider } from "@/auth/AuthProvider";
import { FavoritesProvider } from "@/hooks/useFavorites";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { isConfigured } from "@/lib/supabase";

import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/components.css";

const root = createRoot(document.getElementById("root")!);

root.render(
  <StrictMode>
    {isConfigured ? (
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <FavoritesProvider>
              <App />
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    ) : (
      <SetupNotice />
    )}
  </StrictMode>,
);
