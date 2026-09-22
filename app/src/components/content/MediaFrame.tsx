import { useState } from "react";
import type { Content } from "@/types/models";

interface Props {
  content: Content;
  /** Thumbnail nas listagens; original assinado apenas no detalhe. */
  src: string | null;
  priority?: boolean;
  className?: string;
}

/**
 * Regra absoluta: a imagem aparece inteira, na proporção original.
 * O vazio da moldura é preenchido pelo próprio arquivo ampliado, desfocado e
 * escurecido — nunca por corte, deformação ou barra preta.
 */
export function MediaFrame({ content, src, priority = false, className }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const shape = content.type === "widget" ? " media--widget" : "";

  return (
    <div className={`media${shape}${className ? ` ${className}` : ""}`}>
      {src && !failed && (
        <>
          <div className="media__bg" style={{ backgroundImage: `url("${src}")` }} aria-hidden="true" />
          <div className="media__veil" aria-hidden="true" />
          <img
            className={`media__img${loaded ? " is-loaded" : ""}`}
            src={src}
            alt={content.title}
            width={content.width ?? undefined}
            height={content.height ?? undefined}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        </>
      )}
      {(!src || failed) && (
        <div className="media__fallback">{failed ? "PRÉVIA INDISPONÍVEL" : "PROCESSANDO"}</div>
      )}
    </div>
  );
}
