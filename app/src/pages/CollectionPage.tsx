import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ContentGrid } from "@/components/content/ContentGrid";
import { GridSkeleton } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { useContentFeed } from "@/hooks/useContentFeed";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { plural } from "@/lib/format";
import type { ContentType } from "@/types/models";

interface Props {
  type: ContentType;
  eyebrow: string;
  title: string;
  lede: string;
  searchPlaceholder: string;
}

/** Biblioteca e Widgets compartilham a mesma experiência e o mesmo código. */
export function CollectionPage({ type, eyebrow, title, lede, searchPlaceholder }: Props) {
  const [term, setTerm] = useState("");
  const search = useDebouncedValue(term);
  const feed = useContentFeed(type, search);
  const isWidget = type === "widget";
  const location = useLocation();
  const input = useRef<HTMLInputElement | null>(null);
  const focusSearch = Boolean((location.state as { focusSearch?: boolean } | null)?.focusSearch);

  // Vindo de "Buscar": o campo já recebe o foco (no celular, abre o teclado).
  useEffect(() => {
    if (focusSearch) input.current?.focus({ preventScroll: true });
  }, [focusSearch, location.key]);

  return (
    <>
      <section className="wrap page-head">
        <div className="label label--accent">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="lede">{lede}</p>

        <div className="search" style={{ marginTop: "var(--s-7)" }}>
          <Icon name="search" />
          <label htmlFor="busca" className="sr-only" style={{ display: "none" }}>
            Buscar
          </label>
          <input
            ref={input}
            id="busca"
            type="search"
            value={term}
            placeholder={searchPlaceholder}
            aria-label="Buscar na biblioteca"
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>

        {feed.status === "ready" && (
          <p className="label" style={{ marginTop: "var(--s-5)" }}>
            {plural(feed.total, "item", "itens")}
            {search && ` para “${search}”`}
          </p>
        )}
      </section>

      <section className="wrap" style={{ paddingBottom: "var(--s-10)" }}>
        {feed.status === "loading" && <GridSkeleton count={isWidget ? 4 : 8} widget={isWidget} />}

        {feed.status === "error" && <ErrorState message={feed.error ?? undefined} onRetry={feed.retry} />}

        {feed.status !== "loading" && feed.status !== "error" && feed.items.length === 0 && (
          <EmptyState
            title={search ? "Nada encontrado" : "Ainda não há conteúdos aqui"}
            message={
              search
                ? "Tente outro termo: a busca procura pelo título do conteúdo."
                : "Assim que novos conteúdos forem publicados, eles aparecem nesta lista."
            }
          />
        )}

        {feed.items.length > 0 && (
          <ContentGrid
            items={feed.items}
            widget={isWidget}
            hasMore={feed.hasMore}
            loadingMore={feed.status === "loading-more"}
            onLoadMore={feed.loadMore}
          />
        )}
      </section>
    </>
  );
}

export function LibraryPage() {
  return (
    <CollectionPage
      type="wallpaper"
      eyebrow="A biblioteca"
      title="Wallpapers"
      lede="Toda a coleção, sempre na proporção e na resolução originais."
      searchPlaceholder="Buscar por nome"
    />
  );
}

export function WidgetsPage() {
  return (
    <CollectionPage
      type="widget"
      eyebrow="Widgets Virtus"
      title="Widgets"
      lede="Complementos para compor a tela inteira com a mesma linguagem visual."
      searchPlaceholder="Buscar por nome"
    />
  );
}
