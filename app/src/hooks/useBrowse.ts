import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getNeighbors } from "@/services/content.service";
import { readDetailState } from "@/lib/browse";
import type { DetailState } from "@/lib/browse";
import type { Content } from "@/types/models";

export type Direction = 1 | -1;

/**
 * Anterior e próximo do item aberto. Primeiro na lista de onde ele foi
 * aberto; se a lista é a coleção inteira (ou o link veio direto), o que falta
 * vem do servidor, na mesma ordem das listagens.
 *
 * A troca usa `replace`: o botão voltar do celular fecha o detalhe em vez de
 * refazer o caminho item por item.
 */
export function useBrowse(content: Content | null) {
  const location = useLocation();
  const navigate = useNavigate();
  const detail = readDetailState(location.state);
  const browse = detail.browse;

  const ids = browse?.ids ?? [];
  const index = content ? ids.indexOf(content.id) : -1;
  const localPrevious = index > 0 ? ids[index - 1] : null;
  const localNext = index >= 0 && index < ids.length - 1 ? ids[index + 1] : null;

  const openEnded = !browse || index < 0 || browse.continues;
  const needsServer = Boolean(content) && openEnded && (localPrevious === null || localNext === null);

  const [remote, setRemote] = useState<{ for: string; previousId: string | null; nextId: string | null } | null>(null);

  useEffect(() => {
    if (!content || !needsServer) return;
    let active = true;
    getNeighbors(content)
      .then((neighbors) => {
        if (active) setRemote({ for: content.id, ...neighbors });
      })
      .catch(() => {
        /* sem vizinho do servidor: as setas param onde a lista acaba */
      });
    return () => {
      active = false;
    };
  }, [content, needsServer]);

  const fromServer = remote && content && remote.for === content.id ? remote : null;
  const previousId = localPrevious ?? (openEnded ? fromServer?.previousId ?? null : null);
  const nextId = localNext ?? (openEnded ? fromServer?.nextId ?? null : null);

  const go = useCallback(
    (direction: Direction) => {
      if (!content) return;
      const target = direction === 1 ? nextId : previousId;
      if (!target) return;

      // O que veio do servidor entra na sequência: voltar refaz o mesmo caminho.
      let nextIds = ids;
      if (!ids.includes(target)) {
        const at = ids.indexOf(content.id);
        if (at < 0) nextIds = direction === 1 ? [content.id, target] : [target, content.id];
        else nextIds = direction === 1 ? [...ids, target] : [target, ...ids];
      }

      const state: DetailState & { direction: Direction } = {
        ...detail,
        browse: { ids: nextIds, continues: browse?.continues ?? true },
        direction,
      };
      navigate(`/w/${target}`, { replace: true, state });
    },
    [content, nextId, previousId, ids, detail, browse, navigate],
  );

  const direction = (location.state as { direction?: Direction } | null)?.direction ?? null;

  return { previousId, nextId, go, direction };
}
