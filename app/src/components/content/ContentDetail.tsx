import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { useBrowse } from "@/hooks/useBrowse";
import type { Direction } from "@/hooks/useBrowse";
import { savesToPhotosViaShare } from "@/lib/device";
import { getContent } from "@/services/content.service";
import { signedOriginalUrl } from "@/services/storage.service";
import { readableError } from "@/lib/supabase";
import { formatDate, formatNumber } from "@/lib/format";
import type { Content } from "@/types/models";

/** Distância mínima do arrasto lateral para trocar de item. */
const SWIPE_THRESHOLD = 56;

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
  const { previousId, nextId, go, direction } = useBrowse(content);
  // A animação de entrada pertence ao item que chega — decidida no instante
  // em que ele entra. Se viesse direto da navegação, o item que está saindo
  // também animaria, e a troca pareceria acontecer duas vezes.
  const [enter, setEnter] = useState<Direction | null>(null);
  const directionRef = useRef(direction);
  directionRef.current = direction;

  // Trocando pelas setas, o item atual fica na tela até o próximo chegar:
  // nada de tela de carregamento piscando entre um e outro.
  const shownId = useRef<string | null>(null);
  const frame = useRef<HTMLDivElement | null>(null);
  const touch = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);

  useEffect(() => {
    let active = true;
    if (!shownId.current) setStatus("loading");

    void (async () => {
      try {
        const item = await getContent(contentId);
        if (!active) return;
        if (!item) {
          setStatus("missing");
          return;
        }
        const switching = shownId.current !== null && shownId.current !== item.id;
        setEnter(switching ? directionRef.current : null);
        shownId.current = item.id;
        setContent(item);
        setFullSrc(null);
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

  // Setas do teclado no computador. Campos de texto continuam com as setas.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go]);

  // Arrasto no celular: a arte acompanha o dedo; no fim da lista ela resiste.
  function onTouchStart(event: React.TouchEvent) {
    const point = event.touches[0];
    touch.current = { x: point.clientX, y: point.clientY, axis: null };
  }
  function onTouchMove(event: React.TouchEvent) {
    const start = touch.current;
    if (!start) return;
    const point = event.touches[0];
    const dx = point.clientX - start.x;
    const dy = point.clientY - start.y;
    if (!start.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      start.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (start.axis !== "x" || !frame.current) return;
    const blocked = (dx < 0 && !nextId) || (dx > 0 && !previousId);
    frame.current.style.transition = "none";
    frame.current.style.transform = `translateX(${dx * (blocked ? 0.15 : 0.5)}px)`;
  }
  function onTouchEnd(event: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const direction: Direction = dx < 0 ? 1 : -1;
    const target = direction === 1 ? nextId : previousId;
    if (start.axis === "x" && Math.abs(dx) > SWIPE_THRESHOLD && target) {
      // Troca: a arte fica onde o dedo soltou até o próximo item entrar —
      // voltar ao centro antes faria um vai-e-volta.
      go(direction);
      return;
    }
    if (frame.current) {
      frame.current.style.transition = "";
      frame.current.style.transform = "";
    }
  }

  // O próximo item chegou (ou a troca falhou): a moldura volta ao lugar sem
  // transição, e quem se move é só a animação de entrada do item novo.
  useLayoutEffect(() => {
    if (!frame.current) return;
    frame.current.style.transition = "none";
    frame.current.style.transform = "";
    void frame.current.offsetWidth;
    frame.current.style.transition = "";
  }, [content?.id, status]);

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
          <div
            className="detail__stage"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
          >
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

            <div className="detail__frame" ref={frame}>
              <div
                key={content.id}
                className={`detail__swap${enter ? ` detail__swap--${enter === 1 ? "next" : "prev"}` : ""}`}
              >
                <MediaFrame key={content.id} content={content} src={display} priority natural />
              </div>
            </div>

            <button
              type="button"
              className="detail__nav detail__nav--prev"
              onClick={() => go(-1)}
              disabled={!previousId}
              aria-label="Anterior"
            >
              <Icon name="chevronLeft" size={20} />
            </button>
            <button
              type="button"
              className="detail__nav detail__nav--next"
              onClick={() => go(1)}
              disabled={!nextId}
              aria-label="Próximo"
            >
              <Icon name="chevronRight" size={20} />
            </button>
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
