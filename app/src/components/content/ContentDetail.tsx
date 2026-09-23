import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MediaFrame } from "@/components/content/MediaFrame";
import { Icon } from "@/components/ui/Icon";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { useAuth } from "@/auth/AuthProvider";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import { useDownload } from "@/hooks/useDownload";
import { usePreparedOriginal } from "@/hooks/usePreparedOriginal";
import { savesToPhotosViaShare } from "@/lib/device";
import { getContent } from "@/services/content.service";
import { signedOriginalUrl } from "@/services/storage.service";
import { readableError } from "@/lib/supabase";
import { formatDate, formatNumber } from "@/lib/format";
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
      className="btn btn--secondary btn--block"
      aria-pressed={favorite}
      onClick={() => void toggleFavorite()}
    >
      <Icon name="heart" size={18} />
      {favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
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
  const toPhotos = savesToPhotosViaShare();
  const prepared = usePreparedOriginal(content, toPhotos ? fullSrc : null);

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
        <div className="wrap">
          <LoadingState label="Abrindo" />
        </div>
      </div>
    );
  }

  if (status === "missing") {
    return (
      <div className="detail">
        <div className="wrap">
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
        <div className="wrap">
          <ErrorState message={error ?? undefined} onRetry={() => setReloadKey((key) => key + 1)} />
        </div>
      </div>
    );
  }

  const display = fullSrc ?? content.thumbnail_url;
  const kind = content.type === "widget" ? "Widget" : "Wallpaper";

  return (
    <div className="detail">
      <div className="wrap">
        <Link className="detail__crumb" to="/biblioteca">
          <Icon name="grid" size={18} />
          <span>Biblioteca</span>
        </Link>

        <div className="detail__panel">
          {/* Palco: a ambientação é o próprio wallpaper ampliado, desfocado e
              escurecido; a imagem original fica inteira e nítida na frente. */}
          <div className="detail__stage">
            {display && (
              <div
                className="detail__ambient"
                style={{ backgroundImage: `url("${display}")` }}
                aria-hidden="true"
              />
            )}
            <div className="detail__veil" aria-hidden="true" />

            <button
              type="button"
              className="detail__back"
              onClick={() => (onClose ? onClose() : navigate("/biblioteca"))}
              aria-label="Voltar"
            >
              <Icon name="chevronLeft" size={20} />
            </button>

            <div className="detail__frame">
              <MediaFrame content={content} src={display} priority natural />
            </div>
          </div>

          <div className="detail__info">
            <h1>{content.title}</h1>
            <span className="chip">{kind}</span>

            <p className="lede">
              {session
                ? "Arquivo original, na resolução em que foi criado."
                : "Entre na sua conta para baixar o arquivo em resolução original."}
            </p>

            <div className="detail__actions">
              <button
                type="button"
                className="btn btn--gold btn--block"
                onClick={() => void download(content, prepared.current)}
                disabled={busyId === content.id}
              >
                <Icon name="download" size={18} />
                {busyId === content.id ? "Preparando…" : `Baixar ${kind}`}
              </button>
              <FavoriteButton content={content} />
            </div>

            <p className="detail__help">
              {toPhotos && <>No iPhone, toque em “Salvar imagem” para guardar direto nas Fotos. </>}
              <Link to="/como-aplicar">Como aplicar no celular</Link>
            </p>

            <div className="spec">
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
