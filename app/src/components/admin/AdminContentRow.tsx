import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/feedback/ToastProvider";
import { deleteContentAndFiles, updateContent } from "@/services/library-admin.service";
import { readableError } from "@/lib/supabase";
import { formatDate, formatNumber } from "@/lib/format";
import type { Content, ContentType } from "@/types/models";

interface Props {
  content: Content;
  onSaved: (content: Content) => void;
  onDeleted: (id: string) => void;
  /** Abre a arte grande para revisar o título. */
  onOpen?: () => void;
}

type Mode = "view" | "edit" | "confirm";

/** Uma linha do acervo: ver, editar no lugar ou excluir com confirmação. */
export function AdminContentRow({ content, onSaved, onDeleted, onOpen }: Props) {
  const { notify, notifyError } = useToast();
  const [mode, setMode] = useState<Mode>("view");
  const [title, setTitle] = useState(content.title);
  const [type, setType] = useState<ContentType>(content.type);
  const [busy, setBusy] = useState(false);

  function startEdit() {
    setTitle(content.title);
    setType(content.type);
    setMode("edit");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (title.trim().length < 2) {
      notifyError("Use ao menos 2 caracteres no título.");
      return;
    }
    setBusy(true);
    try {
      onSaved(await updateContent(content.id, { title, type }));
      setMode("view");
      notify("Conteúdo atualizado.");
    } catch (error) {
      notifyError(readableError(error, "Não foi possível salvar."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const { filesRemoved } = await deleteContentAndFiles(content);
      onDeleted(content.id);
      notify(
        filesRemoved
          ? `“${content.title}” foi excluído.`
          : `“${content.title}” saiu da biblioteca, mas os arquivos ficaram no storage.`,
      );
    } catch (error) {
      notifyError(readableError(error, "Não foi possível excluir."));
      setBusy(false);
    }
  }

  const kind = content.type === "widget" ? "Widget" : "Wallpaper";

  return (
    <li className={`admin-row${mode === "confirm" ? " admin-row--danger" : ""}`}>
      <button
        type="button"
        className="admin-row__thumb"
        style={content.thumbnail_url ? { backgroundImage: `url("${content.thumbnail_url}")` } : undefined}
        onClick={onOpen}
        aria-label={`Ver ${content.title} em tamanho grande`}
      />

      {mode === "edit" ? (
        <form className="admin-row__form" onSubmit={save}>
          <input
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Título"
            autoFocus
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ContentType)}
            aria-label="Tipo"
          >
            <option value="wallpaper">Wallpaper</option>
            <option value="widget">Widget</option>
          </select>
          <div className="admin-row__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMode("view")} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>
              {busy ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div style={{ minWidth: 0 }}>
            <div className="admin-row__title">{content.title}</div>
            <div className="admin-row__meta">
              {mode === "confirm"
                ? "Excluir de vez? O arquivo, os favoritos e o histórico deste conteúdo saem junto."
                : `${kind} · ${formatNumber(content.download_count)} downloads · ${formatDate(content.created_at)}`}
            </div>
          </div>

          <div className="admin-row__actions">
            {mode === "confirm" ? (
              <>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setMode("view")} disabled={busy}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm btn--danger"
                  onClick={() => void remove()}
                  disabled={busy}
                >
                  {busy ? "Excluindo…" : "Excluir de vez"}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="icon-btn" onClick={startEdit} aria-label={`Editar ${content.title}`}>
                  <Icon name="edit" size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setMode("confirm")}
                  aria-label={`Excluir ${content.title}`}
                >
                  <Icon name="trash" size={16} />
                </button>
              </>
            )}
          </div>
        </>
      )}
    </li>
  );
}
