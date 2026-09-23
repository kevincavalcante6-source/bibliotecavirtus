import { useState } from "react";
import type { Content } from "@/types/models";

interface Props {
  content: Content;
  /** Thumbnail nas listagens; original assinado apenas no detalhe. */
  src: string | null;
  priority?: boolean;
  className?: string;
  /**
   * `natural` faz a moldura assumir a proporção real do arquivo — nada de
   * sobra em cima e embaixo. É o modo do detalhe e do destaque, onde a peça
   * aparece sozinha. Nas listagens a moldura é fixa, para a grade ter ritmo:
   * ali o vazio é preenchido pela própria arte desfocada.
   */
  natural?: boolean;
}

/**
 * Regra absoluta: a imagem aparece inteira, na proporção original — nunca
 * cortada, esticada ou deformada.
 */
export function MediaFrame({ content, src, priority = false, className, natural }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const ratio = content.width && content.height ? content.width / content.height : null;
  const shape = !natural && content.type === "widget" ? " media--widget" : "";
  const style = natural && ratio ? { aspectRatio: String(ratio) } : undefined;

  return (
    <div className={`media${shape}${className ? ` ${className}` : ""}`} style={style}>
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
