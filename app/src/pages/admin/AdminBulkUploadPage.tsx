import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/feedback/ToastProvider";
import { MAX_FILES_PER_BATCH, useUploadQueue } from "@/hooks/useUploadQueue";
import { formatBytes, plural } from "@/lib/format";
import { TitleReviewer } from "@/components/admin/TitleReviewer";
import type { ReviewItem } from "@/components/admin/TitleReviewer";
import { ratioLabel, sameFormat, standardOf } from "@/lib/aspect";
import { useWallpaperStandard } from "@/hooks/useWallpaperStandard";
import type { ContentType } from "@/types/models";
import type { QueueItem } from "@/hooks/useUploadQueue";

const STATUS_LABEL: Record<QueueItem["status"], string> = {
  pending: "Na fila",
  uploading: "Enviando",
  done: "Publicado",
  error: "Falhou",
  duplicate: "Duplicado",
};

export function AdminBulkUploadPage() {
  const [type, setType] = useState<ContentType>("wallpaper");
  const queue = useUploadQueue(type);
  const { notify, notifyError } = useToast();
  const [dragging, setDragging] = useState(false);
  const [review, setReview] = useState<number | null>(null);

  const reviewItems: ReviewItem[] = queue.items.map((item) => ({
    id: item.id,
    src: item.previewUrl,
    title: item.title,
    editable: !item.reading && item.status !== "uploading" && item.status !== "done",
    note: item.reading
      ? "Lendo o texto da arte…"
      : item.status === "done"
        ? "Já publicado — para mudar o título, use Admin → Conteúdos."
        : undefined,
  }));
  const published = useWallpaperStandard();

  // Padrão: o formato da coleção publicada. Numa biblioteca ainda vazia, o da
  // maioria desta leva (a partir de 3 arquivos). Widgets variam de propósito.
  const standard = useMemo(() => {
    if (type !== "wallpaper") return null;
    if (published) return published;
    const sizes = queue.items.flatMap((item) => (item.size ? [item.size] : []));
    return sizes.length >= 3 ? standardOf(sizes) : null;
  }, [type, published, queue.items]);

  const offFormat = (item: QueueItem) =>
    standard && item.size && item.status !== "error" && item.status !== "duplicate" && !sameFormat(item.size, standard)
      ? ratioLabel(item.size)
      : null;
  const offCount = queue.items.filter((item) => offFormat(item)).length;

  async function receive(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const warning = await queue.addFiles(Array.from(fileList));
    if (warning) notifyError(warning);
  }

  async function onStart() {
    await queue.start();
    const { done, failed, duplicated } = queue.summary;
    if (failed === 0 && duplicated === 0) notify(`${done} conteúdo(s) publicados.`);
    else notify(`Concluído: ${done} enviados, ${failed} com erro, ${duplicated} duplicados.`);
  }

  return (
    <div style={{ display: "grid", gap: "var(--s-5)" }}>
      <div className="field" style={{ maxWidth: 260 }}>
        <label htmlFor="bulk-type">Tipo desta leva</label>
        <select
          id="bulk-type"
          value={type}
          disabled={queue.running}
          onChange={(event) => setType(event.target.value as ContentType)}
        >
          <option value="wallpaper">Wallpapers</option>
          <option value="widget">Widgets</option>
        </select>
      </div>

      <label
        className={`dropzone${dragging ? " is-over" : ""}`}
        htmlFor="bulk-files"
        style={{ cursor: "pointer" }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void receive(event.dataTransfer.files);
        }}
      >
        <Icon name="layers" size={24} />
        <b style={{ fontSize: 15 }}>Arraste até {MAX_FILES_PER_BATCH} arquivos</b>
        <p>
          {MAX_FILES_PER_BATCH} é o limite por operação — você pode repetir quantas levas quiser.
          PNG, JPG ou WebP, até 40 MB cada.
        </p>
        <input
          id="bulk-files"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={(event) => {
            void receive(event.target.files);
            event.target.value = "";
          }}
        />
      </label>

      {queue.items.length > 0 && (
        <>
          <div className="upload-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void onStart()}
              disabled={queue.running || queue.summary.pending === 0 || queue.summary.reading > 0}
            >
              <Icon name="upload" size={18} />
              {queue.running
                ? "Enviando…"
                : queue.summary.reading > 0
                  ? `Lendo os títulos… ${queue.summary.total - queue.summary.reading}/${queue.summary.total}`
                  : `Enviar ${queue.summary.pending} arquivo(s)`}
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={queue.clearFinished}
              disabled={queue.running || queue.summary.done === 0}
            >
              Limpar concluídos
            </button>
            <span className="upload-summary">
              {queue.summary.done}/{queue.summary.total} publicados
              {queue.summary.failed > 0 && ` · ${queue.summary.failed} com erro`}
              {queue.summary.duplicated > 0 && ` · ${plural(queue.summary.duplicated, "duplicado", "duplicados")}`}
            </span>
          </div>

          <div className="upload-hint">
            <p>
              Os títulos vêm da frase escrita em cada arte. Confira antes de enviar: toque numa
              miniatura para ver a arte grande e corrigir o título.
            </p>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setReview(0)}
              disabled={queue.running}
            >
              Revisar títulos um a um
            </button>
          </div>

          {offCount > 0 && standard && (
            <p className="notice notice--warn">
              <b>
                {offCount === 1 ? "1 arquivo está" : `${offCount} arquivos estão`} fora do padrão
                ({standard.label}).
              </b>{" "}
              {offCount === 1
                ? "Está marcado na lista. Pode ser enviado assim — aparece inteiro, mas com outro tamanho nas listas. Se preferir, remova e exporte de novo."
                : "Estão marcados na lista. Podem ser enviados assim — aparecem inteiros, mas com outro tamanho nas listas. Se preferir, remova e exporte de novo."}
            </p>
          )}

          <div className="bar bar--total" aria-label="Progresso geral">
            <i style={{ width: `${Math.round(queue.summary.overall * 100)}%` }} />
          </div>

          <ul className="queue">
            {queue.items.map((item) => (
              <li key={item.id} className="queue__row">
                <button
                  type="button"
                  className="queue__thumb"
                  style={{ backgroundImage: `url("${item.previewUrl}")` }}
                  onClick={() => setReview(queue.items.indexOf(item))}
                  aria-label={`Ver ${item.title} em tamanho grande`}
                />

                <div style={{ minWidth: 0 }}>
                  <input
                    className="queue__name"
                    value={item.title}
                    aria-label={`Título de ${item.file.name}`}
                    disabled={item.status === "uploading" || item.status === "done" || item.reading}
                    onChange={(event) => queue.setTitle(item.id, event.target.value)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: 0,
                      outline: "none",
                      padding: 0,
                    }}
                  />
                  <div
                    className={`queue__status${
                      item.status === "error" || item.status === "duplicate"
                        ? " is-error"
                        : item.status === "done"
                          ? " is-done"
                          : ""
                    }`}
                  >
                    {item.reading ? "Lendo o texto da arte…" : STATUS_LABEL[item.status]} · {formatBytes(item.file.size)}
                    {item.error && ` · ${item.error}`}
                    {offFormat(item) && <span className="queue__warn"> · formato {offFormat(item)}</span>}
                  </div>
                  {item.status === "uploading" && (
                    <div className="bar">
                      <i style={{ width: `${Math.round(item.progress * 100)}%` }} />
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "var(--s-2)" }}>
                  {item.status === "error" && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Tentar novamente ${item.title}`}
                      onClick={() => void queue.retry(item.id)}
                      disabled={queue.running}
                    >
                      <Icon name="refresh" size={16} />
                    </button>
                  )}
                  {item.status !== "uploading" && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remover ${item.title} da fila`}
                      onClick={() => queue.remove(item.id)}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                  {item.status === "done" && (
                    <span className="queue__status is-done">
                      <Icon name="check" size={16} />
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {review !== null && reviewItems.length > 0 && (
        <TitleReviewer
          items={reviewItems}
          index={Math.min(review, reviewItems.length - 1)}
          onIndex={setReview}
          onClose={() => setReview(null)}
          onSave={(id, title) => queue.setTitle(id, title)}
        />
      )}
    </div>
  );
}
