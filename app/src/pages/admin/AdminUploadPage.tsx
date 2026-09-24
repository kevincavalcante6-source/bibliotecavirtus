import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/feedback/ToastProvider";
import { readImageSize, titleFromFilename, validateImage } from "@/lib/files";
import type { ImageSize } from "@/lib/files";
import { ratioLabel, sameFormat } from "@/lib/aspect";
import { readTitle, releaseOcr } from "@/lib/ocr";
import { useWallpaperStandard } from "@/hooks/useWallpaperStandard";
import { formatBytes } from "@/lib/format";
import { readableError } from "@/lib/supabase";
import { DuplicateError, uploadContentFile } from "@/services/upload.service";
import type { ContentType } from "@/types/models";

/** Envio individual: um arquivo, um título, um tipo. */
export function AdminUploadPage() {
  const { notify, notifyError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ContentType>("wallpaper");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [size, setSize] = useState<ImageSize | null>(null);
  const [reading, setReading] = useState(false);
  const [titleFromArt, setTitleFromArt] = useState(false);
  const titleEdited = useRef(false);
  const pickId = useRef(0);

  useEffect(() => () => void releaseOcr(), []);
  const standard = useWallpaperStandard();

  // Só avisa: o arquivo sobe inteiro do mesmo jeito. É para nenhum wallpaper
  // entrar com outro formato sem você perceber.
  const offFormat =
    type === "wallpaper" && standard && size && !sameFormat(size, standard) ? ratioLabel(size) : null;

  function pick(selected: File | null) {
    setError(null);
    setDone(null);
    if (preview) URL.revokeObjectURL(preview);
    setSize(null);
    pickId.current += 1;
    setReading(false);
    if (!selected) {
      setFile(null);
      setPreview(null);
      return;
    }
    const invalid = validateImage(selected);
    if (invalid) {
      setError(invalid);
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setTitleFromArt(false);
    titleEdited.current = false;
    setTitle(titleFromFilename(selected.name));

    // A frase da arte vira o título sugerido — se você não tiver digitado antes.
    const id = ++pickId.current;
    setReading(true);
    void readTitle(selected).then((found) => {
      if (id !== pickId.current) return;
      setReading(false);
      if (found && !titleEdited.current) {
        setTitle(found);
        setTitleFromArt(true);
      }
    });
    readImageSize(selected)
      .then(setSize)
      .catch(() => setSize(null));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file || title.trim().length < 2) {
      setError("Escolha um arquivo e dê um título de ao menos 2 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      const content = await uploadContentFile({ file, title, type, onProgress: setProgress });
      setDone(content.title);
      notify("Conteúdo publicado na biblioteca.");
      pick(null);
      setTitle("");
    } catch (caught) {
      const message =
        caught instanceof DuplicateError
          ? caught.message
          : readableError(caught, "Falha ao publicar o conteúdo.");
      setError(message);
      notifyError(message);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "var(--s-5)", maxWidth: 560 }}>
      <label className="dropzone" htmlFor="file" style={{ cursor: "pointer" }}>
        {preview ? (
          <img
            src={preview}
            alt=""
            style={{ maxHeight: 260, objectFit: "contain", borderRadius: "var(--r-2)" }}
          />
        ) : (
          <Icon name="upload" size={24} />
        )}
        <b style={{ fontSize: 15 }}>{file ? file.name : "Escolher arquivo"}</b>
        <p>{file ? formatBytes(file.size) : "PNG, JPG ou WebP, até 40 MB."}</p>
        <input
          id="file"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={(event) => pick(event.target.files?.[0] ?? null)}
        />
      </label>

      <div className="field">
        <label htmlFor="title">Título</label>
        <input
          id="title"
          type="text"
          value={title}
          maxLength={120}
          onChange={(event) => {
            titleEdited.current = true;
            setTitleFromArt(false);
            setTitle(event.target.value);
          }}
        />
        {reading && <span className="hint">Lendo a frase da arte…</span>}
        {!reading && titleFromArt && <span className="hint">Título lido da arte — confira antes de publicar.</span>}
      </div>

      <div className="field">
        <label htmlFor="type">Tipo</label>
        <select id="type" value={type} onChange={(event) => setType(event.target.value as ContentType)}>
          <option value="wallpaper">Wallpaper</option>
          <option value="widget">Widget</option>
        </select>
      </div>

      {offFormat && size && standard && (
        <p className="notice notice--warn">
          <b>Formato diferente do padrão.</b> Este arquivo é {offFormat} ({size.width} × {size.height}); a
          maioria dos wallpapers da biblioteca é {standard.label}. Ele pode ser publicado assim — vai
          aparecer inteiro, mas com outro tamanho nas listas.
        </p>
      )}

      {busy && (
        <div className="bar" aria-label="Progresso do envio">
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {error && <p className="notice notice--error">{error}</p>}
      {done && (
        <p className="notice notice--success">
          <Icon name="check" size={14} /> “{done}” está na biblioteca.
        </p>
      )}

      <button type="submit" className="btn btn--primary" disabled={busy || !file}>
        {busy ? `Enviando… ${Math.round(progress * 100)}%` : "Publicar conteúdo"}
      </button>
    </form>
  );
}
