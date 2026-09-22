import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { MediaFrame } from "@/components/content/MediaFrame";
import { GridSkeleton } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDownload } from "@/hooks/useDownload";
import { listDownloads } from "@/services/downloads.service";
import { formatDate, plural } from "@/lib/format";

export function DownloadsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { download, busyId } = useDownload();
  const { data, status, error, reload } = useAsyncData(
    () => (user ? listDownloads(user.id) : Promise.resolve([])),
    [user?.id],
  );

  const items = data ?? [];

  return (
    <>
      <section className="wrap page-head">
        <div className="label label--accent">Seu histórico</div>
        <h1>Meus downloads</h1>
        <p className="lede">
          Tudo que você já baixou continua acessível — sempre o arquivo original.
        </p>
        {status === "ready" && (
          <p className="label" style={{ marginTop: "var(--s-5)" }}>
            {plural(items.length, "conteúdo", "conteúdos")}
          </p>
        )}
      </section>

      <section className="wrap" style={{ paddingBottom: "var(--s-10)" }}>
        {status === "loading" && <GridSkeleton count={4} />}
        {status === "error" && <ErrorState message={error ?? undefined} onRetry={reload} />}
        {status === "ready" && items.length === 0 && (
          <EmptyState
            title="Nenhum download ainda"
            message="Abra um conteúdo e toque em Baixar: ele aparece aqui depois."
            actionLabel="Ir para a biblioteca"
            actionTo="/biblioteca"
          />
        )}

        {status === "ready" && items.length > 0 && (
          <div className="grid">
            {items.map(({ content, at }) => (
              <article className="card" key={content.id}>
                <Link to={`/w/${content.id}`} state={{ background: location }} className="card__open">
                  <MediaFrame content={content} src={content.thumbnail_url} />
                </Link>
                <div className="card__meta">
                  <h3>{content.title}</h3>
                  <p>Baixado em {formatDate(at)}</p>
                </div>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => void download(content)}
                  disabled={busyId === content.id}
                >
                  <Icon name="download" size={16} />
                  {busyId === content.id ? "Preparando…" : "Baixar de novo"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
