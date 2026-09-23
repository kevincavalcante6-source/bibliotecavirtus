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
   * sobra em cima, embaixo ou dos lados. É o modo das listagens, do detalhe e
   * do destaque. Sem ele a moldura é fixa: só as laterais desfocadas do
   * carrossel usam, porque ali a arte é apenas ambientação.
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
  // `--ratio` deixa o CSS dimensionar a moldura pelos dois lados (largura e
  // altura disponíveis) sem nunca ultrapassar o espaço — e sem cortar.
  const style =
    natural && ratio
      ? ({ aspectRatio: String(ratio), "--ratio": String(ratio) } as React.CSSProperties)
      : undefined;

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
