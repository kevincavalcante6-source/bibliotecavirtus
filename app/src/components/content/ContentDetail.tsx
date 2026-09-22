import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MediaFrame } from "@/components/content/MediaFrame";
import { Icon } from "@/components/ui/Icon";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useAuth } from "@/auth/AuthProvider";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { useDownload } from "@/hooks/useDownload";
import { getContent } from "@/services/content.service";
import { signedOriginalUrl } from "@/services/storage.service";
import { readableError } from "@/lib/supabase";
import { formatBytes, formatDate, formatNumber, formatRatio } from "@/lib/format";
import type { Content } from "@/types/models";

interface Props {
  contentId: string;
  onClose?: () => void;
}

function FavoriteButton({ content }: { content: Content }) {
  const { favorite, toggleFavorite } = useFavoriteToggle(content);
  return (
    <button
      type="button"
      className="icon-btn"
      style={{ width: 52, height: 52 }}
      aria-pressed={favorite}
      aria-label={favorite ? "Remover dos favoritos" : "Favoritar"}
      onClick={() => void toggleFavorite()}
    >
      <Icon name="heart" size={20} />
    </button>
  );
}

export function ContentDetail({ contentId, onClose }: Props) {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [content, setContent] = useState<Content | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing">("loading");
  const [error, setError] = useState<string | null>(null);
  const [fullSrc, setFullSrc] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const { download, busyId } = useDownload((_id, total) => setDownloads(total));

  useEffect(() => {
    let active = true;
    setStatus("loading");
    setFullSrc(null);

    void (async () => {
      try {
        const item = await getContent(contentId);
        if (!active) return;
        if (!item) {
          setStatus("missing");
          return;
        }
        setContent(item);
        setDownloads(item.download_count);
        setStatus("ready");

        // O original vive em bucket privado: quem tem sessão vê a imagem
        // completa; visitantes ficam com a prévia até entrarem.
        if (session) {
          try {
            const url = await signedOriginalUrl(item.file_url);
            if (active) setFullSrc(url);
          } catch {
            /* mantém o thumbnail */
          }
        }
      } catch (caught) {
        if (!active) return;
        setError(readableError(caught, "Não foi possível abrir este conteúdo."));
        setStatus("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [contentId, session, reloadKey]);

  if (status === "loading") {
    return (
      <div className="detail">
        <div className="detail__body wrap">
          <LoadingState label="Abrindo" />
        </div>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="detail">
        <div className="detail__body wrap">
          <EmptyState
            title="Conteúdo não encontrado"
            message="Este item não está mais na biblioteca."
            actionLabel="Voltar à biblioteca"
            actionTo="/biblioteca"
          />
        </div>
      </div>
    );
  }

  if (status === "error" || !content) {
    return (
      <div className="detail">
        <div className="detail__body wrap">
          <ErrorState message={error ?? undefined} onRetry={() => setReloadKey((key) => key + 1)} />
        </div>
      </div>
    );
  }

  const display = fullSrc ?? content.thumbnail_url;

  return (
    <div className="detail">
      {display && (
        <div className="detail__bg" style={{ backgroundImage: `url("${display}")` }} aria-hidden="true" />
      )}
      <div className="detail__veil" aria-hidden="true" />

      <div className="detail__body">
        <div className="wrap detail__top">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => (onClose ? onClose() : navigate("/biblioteca"))}
          >
            <Icon name="chevronLeft" />
            Voltar
          </button>
          {onClose && (
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
              <Icon name="close" />
            </button>
          )}
        </div>

        <div className="wrap detail__inner">
          <div className="detail__frame">
            <MediaFrame content={content} src={display} priority />
          </div>

          <div className="detail__info">
            <div className="label label--accent">
              {content.type === "widget" ? "Widget" : "Wallpaper"}
            </div>
            <h1>{content.title}</h1>
            <p className="lede">
              {session
                ? "Arquivo original, na resolução em que foi criado."
                : "Entre na sua conta para baixar o arquivo em resolução original."}
            </p>

            <div className="detail__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void download(content)}
                disabled={busyId === content.id}
              >
                <Icon name="download" />
                {busyId === content.id ? "Preparando…" : "Baixar"}
              </button>
              <FavoriteButton content={content} />
            </div>

            <div className="spec">
              <div>
                <span>Proporção</span>
                <b>{formatRatio(content.width, content.height)}</b>
              </div>
              <div>
                <span>Resolução</span>
                <b>
                  {content.width && content.height ? `${content.width} × ${content.height}` : "—"}
                </b>
              </div>
              <div>
                <span>Arquivo</span>
                <b>
                  {(content.mime_type?.split("/")[1] ?? "—").toUpperCase()} ·{" "}
                  {formatBytes(content.file_size)}
                </b>
              </div>
              <div>
                <span>Downloads</span>
                <b>{formatNumber(downloads ?? content.download_count)}</b>
              </div>
              <div>
                <span>Adicionado em</span>
                <b>{formatDate(content.created_at)}</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
