import { Link } from "react-router-dom";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { fetchAdminStats } from "@/services/admin.service";
import { formatDate, formatNumber } from "@/lib/format";
import type { AdminRankItem } from "@/types/models";

function Rank({
  title,
  items,
  valueOf,
  empty,
}: {
  title: string;
  items: AdminRankItem[];
  valueOf: (item: AdminRankItem) => string;
  empty: string;
}) {
  return (
    <section>
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 14, paddingBlock: "var(--s-3)" }}>{empty}</p>
      ) : (
        <ul className="rank">
          {items.map((item) => (
            <li key={item.id}>
              <span
                className="thumb"
                style={item.thumbnail_url ? { backgroundImage: `url("${item.thumbnail_url}")` } : undefined}
                aria-hidden="true"
              />
              <Link className="grow" to={`/w/${item.id}`}>
                {item.title}
              </Link>
              <b>{valueOf(item)}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminDashboardPage() {
  const { data, status, error, reload } = useAsyncData(fetchAdminStats, []);

  if (status === "loading") return <LoadingState label="Carregando o painel" />;
  if (status === "error") return <ErrorState message={error ?? undefined} onRetry={reload} />;
  if (!data) return <EmptyState title="Sem dados" message="O painel não retornou informações." />;

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <b>{formatNumber(data.wallpapers)}</b>
          <span>Wallpapers</span>
        </div>
        <div className="stat">
          <b>{formatNumber(data.widgets)}</b>
          <span>Widgets</span>
        </div>
        <div className="stat">
          <b>{formatNumber(data.users)}</b>
          <span>Usuários</span>
        </div>
        <div className="stat">
          <b>{formatNumber(data.downloads)}</b>
          <span>Downloads</span>
        </div>
        <div className="stat">
          <b>{formatNumber(data.favorites)}</b>
          <span>Favoritos</span>
        </div>
      </div>

      <div className="board">
        <Rank
          title="Mais baixados"
          items={data.most_downloaded}
          valueOf={(item) => formatNumber(item.download_count ?? 0)}
          empty="Nenhum download registrado ainda."
        />
        <Rank
          title="Mais favoritados"
          items={data.most_favorited}
          valueOf={(item) => formatNumber(item.favorite_count ?? 0)}
          empty="Nenhum favorito registrado ainda."
        />
        <Rank
          title="Adicionados recentemente"
          items={data.recent}
          valueOf={(item) => formatDate(item.created_at)}
          empty="A biblioteca ainda está vazia."
        />
      </div>
    </>
  );
}
