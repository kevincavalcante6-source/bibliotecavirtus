import { useAuth } from "@/auth/AuthProvider";
import { ContentGrid } from "@/components/content/ContentGrid";
import { GridSkeleton } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useFavorites } from "@/hooks/useFavorites";
import { listFavorites } from "@/services/favorites.service";
import { plural } from "@/lib/format";

export function FavoritesPage() {
  const { user } = useAuth();
  const { ids } = useFavorites();
  const { data, status, error, reload } = useAsyncData(
    () => (user ? listFavorites(user.id) : Promise.resolve([])),
    [user?.id],
  );

  // Reflete remoções feitas na própria página sem nova ida ao servidor.
  const items = (data ?? []).filter((item) => ids.has(item.id));

  return (
    <>
      <section className="wrap page-head">
        <div className="label label--accent">Seus salvos</div>
        <h1>Favoritos</h1>
        <p className="lede">O que você salvou fica reunido aqui, em qualquer aparelho.</p>
        {status === "ready" && (
          <p className="label" style={{ marginTop: "var(--s-5)" }}>
            {plural(items.length, "item", "itens")}
          </p>
        )}
      </section>

      <section className="wrap" style={{ paddingBottom: "var(--s-10)" }}>
        {status === "loading" && <GridSkeleton count={4} />}
        {status === "error" && <ErrorState message={error ?? undefined} onRetry={reload} />}
        {status === "ready" && items.length === 0 && (
          <EmptyState
            title="Nenhum favorito ainda"
            message="Toque no coração de um wallpaper ou widget para guardá-lo aqui."
            actionLabel="Ir para a biblioteca"
            actionTo="/biblioteca"
          />
        )}
        {status === "ready" && items.length > 0 && <ContentGrid items={items} />}
      </section>
    </>
  );
}
