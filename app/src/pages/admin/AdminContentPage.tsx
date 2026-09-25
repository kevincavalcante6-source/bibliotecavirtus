import { useState } from "react";
import { AdminContentRow } from "@/components/admin/AdminContentRow";
import { TitleReviewer } from "@/components/admin/TitleReviewer";
import { useToast } from "@/components/feedback/ToastProvider";
import { updateContent } from "@/services/library-admin.service";
import { readableError } from "@/lib/supabase";
import { LoadingState } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { useContentFeed } from "@/hooks/useContentFeed";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { plural } from "@/lib/format";
import type { Content, ContentType } from "@/types/models";

const FILTERS: { value: ContentType | undefined; label: string }[] = [
  { value: undefined, label: "Todos" },
  { value: "wallpaper", label: "Wallpapers" },
  { value: "widget", label: "Widgets" },
];

/** Todo o acervo, pesquisável, com edição e exclusão por linha. */
export function AdminContentPage() {
  const [term, setTerm] = useState("");
  const search = useDebouncedValue(term);
  const [type, setType] = useState<ContentType | undefined>(undefined);
  const feed = useContentFeed(type, search);

  // Alterações feitas nesta tela, aplicadas por cima do que veio do servidor:
  // a lista reflete na hora sem recarregar e sem perder a posição.
  const [edited, setEdited] = useState<Record<string, Content>>({});
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [review, setReview] = useState<number | null>(null);
  const { notifyError } = useToast();

  const items = feed.items
    .filter((item) => !removed.has(item.id))
    .map((item) => edited[item.id] ?? item)
    .filter((item) => !type || item.type === type);

  return (
    <div>
      <div className="admin-toolbar">
        <div className="search" style={{ flex: "1 1 280px" }}>
          <Icon name="search" />
          <input
            type="search"
            value={term}
            placeholder="Buscar pelo título"
            aria-label="Buscar no acervo"
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: "var(--s-2)" }}>
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              className={`btn btn--sm ${type === filter.value ? "btn--primary" : "btn--secondary"}`}
              aria-pressed={type === filter.value}
              onClick={() => setType(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {feed.status === "ready" && (
        <p className="label" style={{ marginTop: "var(--s-5)" }}>
          {plural(Math.max(0, feed.total - removed.size), "conteúdo", "conteúdos")}
        </p>
      )}

      {feed.status === "loading" && <LoadingState label="Carregando o acervo" />}
      {feed.status === "error" && <ErrorState message={feed.error ?? undefined} onRetry={feed.retry} />}

      {feed.status !== "loading" && feed.status !== "error" && items.length === 0 && (
        <EmptyState
          title={search ? "Nada encontrado" : "O acervo está vazio"}
          message={
            search ? "A busca procura pelo título do conteúdo." : "Os conteúdos enviados aparecem aqui."
          }
          actionLabel={search ? undefined : "Enviar conteúdo"}
          actionTo={search ? undefined : "/admin/upload"}
        />
      )}

      {items.length > 0 && (
        <ul className="admin-list">
          {items.map((item) => (
            <AdminContentRow
              key={item.id}
              content={item}
              onSaved={(updated) => setEdited((current) => ({ ...current, [updated.id]: updated }))}
              onDeleted={(id) => setRemoved((current) => new Set(current).add(id))}
              onOpen={() => setReview(items.indexOf(item))}
            />
          ))}
        </ul>
      )}

      {feed.hasMore && (
        <div style={{ marginTop: "var(--s-5)", display: "flex", justifyContent: "center" }}>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={feed.loadMore}
            disabled={feed.status === "loading-more"}
          >
            {feed.status === "loading-more" ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
      {review !== null && items.length > 0 && (
        <TitleReviewer
          items={items.map((item) => ({ id: item.id, src: item.thumbnail_url, title: item.title, editable: true }))}
          index={Math.min(review, items.length - 1)}
          onIndex={setReview}
          onClose={() => setReview(null)}
          onSave={async (id, title) => {
            const target = items.find((item) => item.id === id);
            if (!target) return;
            try {
              const updated = await updateContent(id, { title, type: target.type });
              setEdited((current) => ({ ...current, [updated.id]: updated }));
            } catch (error) {
              notifyError(readableError(error, "Não foi possível salvar o título."));
              throw error;
            }
          }}
        />
      )}
    </div>
  );
}
