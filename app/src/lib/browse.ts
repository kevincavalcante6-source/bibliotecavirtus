import type { Location } from "react-router-dom";

/**
 * A sequência que o detalhe percorre com as setas e o arrasto: a lista de
 * onde a pessoa abriu o item, na mesma ordem em que ela via.
 */
export interface BrowseState {
  ids: string[];
  /**
   * A lista é a coleção inteira na ordem padrão (biblioteca, widgets, home):
   * ao chegar no fim do que já carregou, o próximo vem do servidor. Busca e
   * favoritos são listas fechadas e param no último item.
   */
  continues: boolean;
}

export interface DetailState {
  background?: Location;
  browse?: BrowseState;
}

export function readDetailState(state: unknown): DetailState {
  return (state as DetailState | null) ?? {};
}
