import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useScrollLock } from "@/hooks/useScrollLock";

export interface ReviewItem {
  id: string;
  src: string | null;
  title: string;
  /** Falso para o que já foi enviado ou está subindo agora. */
  editable: boolean;
  note?: string;
}

interface Props {
  items: ReviewItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  /** Pode ser assíncrono (salvar no banco); a revisão espera antes de seguir. */
  onSave: (id: string, title: string) => void | Promise<void>;
}

/**
 * Revisão de títulos com a arte grande na tela: lê a frase, corrige o título
 * e segue para o próximo com Enter. ← → navegam fora do campo; Esc fecha.
 */
export function TitleReviewer({ items, index, onIndex, onClose, onSave }: Props) {
  useScrollLock(true);
  const item = items[index];
  const [draft, setDraft] = useState(item?.title ?? "");
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  // Troca de item: o campo recebe o título dele e, só depois que o valor novo
  // já está na tela, fica todo selecionado — digitar substitui em vez de somar.
  const pendingSelect = useRef<string | null>(null);
  useEffect(() => {
    const title = item?.title ?? "";
    pendingSelect.current = title;
    setDraft(title);
  }, [item?.id]);

  useEffect(() => {
    const field = input.current;
    if (pendingSelect.current === null || !field || field.value !== pendingSelect.current) return;
    pendingSelect.current = null;
    field.focus();
    field.select();
  });

  async function commit() {
    if (!item || !item.editable) return true;
    const title = draft.trim();
    if (title.length < 2 || title === item.title) return true;
    setSaving(true);
    try {
      await onSave(item.id, title);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function go(step: 1 | -1) {
    if (!(await commit())) return;
    const next = index + step;
    if (next < 0) return;
    if (next >= items.length) onClose();
    else onIndex(next);
  }

  async function close() {
    if (await commit()) onClose();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        void close();
        return;
      }
      const inField = event.target === input.current;
      if (inField) return;
      if (event.key === "ArrowRight") void go(1);
      if (event.key === "ArrowLeft") void go(-1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (!item) return null;

  return (
    <div className="reviewer" role="dialog" aria-modal="true" aria-label="Revisar títulos">
      <div className="reviewer__top">
        <span className="label">
          {index + 1} / {items.length}
        </span>
        <button type="button" className="icon-btn" onClick={() => void close()} aria-label="Fechar">
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="reviewer__stage">
        {item.src ? <img key={item.id} src={item.src} alt="" /> : <div className="reviewer__empty">Sem prévia</div>}
      </div>

      <form
        className="reviewer__form"
        onSubmit={(event) => {
          event.preventDefault();
          void go(1);
        }}
      >
        <input
          ref={input}
          className="reviewer__input"
          value={draft}
          maxLength={120}
          disabled={!item.editable || saving}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.shiftKey) {
              event.preventDefault();
              void go(-1);
            }
          }}
          aria-label="Título"
        />
        {item.note && <p className="reviewer__note">{item.note}</p>}

        <div className="reviewer__actions">
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => void go(-1)} disabled={index === 0 || saving}>
            <Icon name="chevronLeft" size={16} />
            Anterior
          </button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            {saving ? "Salvando…" : index === items.length - 1 ? "Salvar e fechar" : "Salvar e próximo"}
            {!saving && <Icon name="chevronRight" size={16} />}
          </button>
        </div>
        <p className="reviewer__hint">Enter: salvar e ir para o próximo · Shift + Enter: anterior · Esc: fechar</p>
      </form>
    </div>
  );
}
