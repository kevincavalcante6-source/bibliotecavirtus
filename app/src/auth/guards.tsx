import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { LoadingState } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/states/EmptyState";
import { NoAccessPage } from "@/pages/NoAccessPage";

/** Rota que exige sessão válida. O servidor também recusa — isto é só UX. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Verificando sua sessão" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/**
 * A biblioteca é de quem comprou. Sem sessão: login. Com sessão mas sem compra
 * aprovada: a tela que explica o que fazer. O banco recusa o conteúdo do mesmo
 * jeito — esta guarda só evita mostrar uma página vazia.
 */
export function RequireAccess({ children }: { children: ReactNode }) {
  const { session, loading, hasAccess, accessChecking } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Verificando sua sessão" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (accessChecking) return <LoadingState label="Verificando seu acesso" />;
  if (!hasAccess) return <NoAccessPage />;
  return <>{children}</>;
}

/**
 * Esconde a área administrativa de quem não é admin. A proteção real está no
 * banco: RLS nas tabelas, políticas no storage e checagem dentro da RPC.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Verificando permissões" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) return <LoadingState label="Carregando seu perfil" />;
  if (profile.role !== "admin") {
    return (
      <div className="wrap">
        <EmptyState
          title="Área restrita"
          message="Esta seção é exclusiva da administração da Biblioteca Virtus."
          actionLabel="Voltar à biblioteca"
          actionTo="/biblioteca"
        />
      </div>
    );
  }
  return <>{children}</>;
}
