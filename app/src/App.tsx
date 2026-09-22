import { Route, Routes, useLocation } from "react-router-dom";
import type { Location } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DetailOverlay } from "@/components/content/DetailOverlay";
import { RequireAdmin, RequireAuth } from "@/auth/guards";
import { HomePage } from "@/pages/HomePage";
import { LibraryPage, WidgetsPage } from "@/pages/CollectionPage";
import { DetailPage } from "@/pages/DetailPage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { DownloadsPage } from "@/pages/DownloadsPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { NewPasswordPage, RecoverPage } from "@/pages/auth/RecoverPages";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminUploadPage } from "@/pages/admin/AdminUploadPage";
import { AdminBulkUploadPage } from "@/pages/admin/AdminBulkUploadPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function App() {
  const location = useLocation();
  // Quando o detalhe é aberto a partir de uma listagem, a listagem continua
  // renderizada por baixo — é isso que preserva a posição de scroll.
  const background = (location.state as { background?: Location } | null)?.background;

  return (
    <>
      <Routes location={background ?? location}>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="biblioteca" element={<LibraryPage />} />
          <Route path="widgets" element={<WidgetsPage />} />
          <Route path="w/:id" element={<DetailPage />} />

          <Route path="login" element={<LoginPage />} />
          <Route path="cadastro" element={<SignupPage />} />
          <Route path="recuperar" element={<RecoverPage />} />
          <Route path="nova-senha" element={<NewPasswordPage />} />

          <Route
            path="favoritos"
            element={
              <RequireAuth>
                <FavoritesPage />
              </RequireAuth>
            }
          />
          <Route
            path="downloads"
            element={
              <RequireAuth>
                <DownloadsPage />
              </RequireAuth>
            }
          />
          <Route
            path="perfil"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />

          <Route
            path="admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="upload" element={<AdminUploadPage />} />
            <Route path="upload-em-massa" element={<AdminBulkUploadPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>

      {background && (
        <Routes>
          <Route path="/w/:id" element={<DetailOverlay />} />
        </Routes>
      )}
    </>
  );
}
