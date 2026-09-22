import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** Deixa explícito que nada aqui é dado real nem sai deste navegador. */
export function DemoBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <aside className="demo-banner">
      <span className="demo-banner__dot" aria-hidden="true" />
      <p>
        <b>Demonstração</b> — conteúdos de exemplo, guardados só neste navegador. Downloads e
        e-mails não saem daqui; na versão conectada tudo isso passa pelo servidor.
      </p>
      <button type="button" onClick={() => setOpen(false)} aria-label="Fechar aviso">
        <Icon name="close" size={16} />
      </button>
    </aside>
  );
}
