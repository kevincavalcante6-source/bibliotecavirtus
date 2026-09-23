import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { MediaFrame } from "@/components/content/MediaFrame";
import { GridSkeleton } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { useToast } from "@/components/feedback/ToastProvider";
import { Icon } from "@/components/ui/Icon";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDownload } from "@/hooks/useDownload";
import { hideDownload, listDownloads } from "@/services/downloads.service";
import { readableError } from "@/lib/supabase";
import { formatDate, plural } from "@/lib/format";
import type { BrowseState } from "@/lib/browse";

export function DownloadsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { notify, notifyError } = useToast();
  const { download, busyId } = useDownload();
  const { data, status, error, reload } = useAsyncData(
    () => (user ? listDownloads(user.id) : Promise.resolve([])),
    [user?.id],
  );

  // Remoções desta visita, aplicadas na hora e desfeitas se o banco recusar.
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const items = (data ?? []).filter(({ content }) => !hidden.has(content.id));

  async function remove(contentId: string, title: string) {
    if (!user) return;
    setHidden((current) => new Set(current).add(contentId));
    try {
      await hideDownload(user.id, contentId);
      notify(`“${title}” saiu do seu histórico.`);
    } catch (caught) {
      setHidden((current) => {
        const next = new Set(current);
        next.delete(contentId);
        return next;
      });
      notifyError(readableError(caught, "Não foi possível remover agora."));
    }
  }

  // O detalhe percorre o histórico na ordem desta página, e para no último.
  const browse: BrowseState = { ids: items.map(({ content }) => content.id), continues: false };

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
            title="Nenhum download aqui"
            message="Abra um conteúdo e toque em Baixar: ele aparece nesta lista."
            actionLabel="Ir para a biblioteca"
            actionTo="/biblioteca"
          />
        )}

        {status === "ready" && items.length > 0 && (
          <div className="grid">
            {items.map(({ content, at }) => (
              <article className="card" key={content.id}>
                <Link to={`/w/${content.id}`} state={{ background: location, browse }} className="card__open">
                  <MediaFrame content={content} src={content.thumbnail_url} natural />
                </Link>

                <button
                  type="button"
                  className="card__fav"
                  onClick={() => void remove(content.id, content.title)}
                  aria-label={`Remover ${content.title} do histórico`}
                  title="Remover do histórico"
                >
                  <Icon name="close" size={16} />
                </button>

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
