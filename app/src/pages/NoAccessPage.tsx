import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

/**
 * Conta existe, mas o e-mail não tem compra aprovada. Os dois motivos mais
 * comuns — outro e-mail na compra, ou aprovação que ainda está chegando —
 * têm saída direta aqui mesmo.
 */
export function NoAccessPage() {
  const { user, signOut, refreshAccess, hasAccess } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [checkedOnce, setCheckedOnce] = useState(false);

  async function checkAgain() {
    setChecking(true);
    await refreshAccess();
    setChecking(false);
    setCheckedOnce(true);
  }

  async function switchAccount() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="wrap">
      <div className="auth">
        <div>
          <div className="label label--accent">Acesso</div>
          <h1 style={{ marginTop: "var(--s-4)" }}>Acesso não encontrado</h1>
          <p className="lede" style={{ marginTop: "var(--s-3)" }}>
            Não encontramos uma compra aprovada para <b>{user?.email}</b>.
          </p>
        </div>

        <ul className="notice" style={{ display: "grid", gap: "var(--s-3)", lineHeight: 1.55 }}>
          <li>
            <b>Comprou com outro e-mail?</b> Entre com o mesmo e-mail usado na compra.
          </li>
          <li>
            <b>A compra acabou de ser aprovada?</b> A liberação costuma levar poucos instantes.
            Verifique de novo em seguida.
          </li>
        </ul>

        {checkedOnce && !hasAccess && !checking && (
          <p className="notice notice--error">Ainda não há compra aprovada para este e-mail.</p>
        )}

        <div style={{ display: "grid", gap: "var(--s-3)" }}>
          <button type="button" className="btn btn--primary btn--block" onClick={() => void checkAgain()} disabled={checking}>
            {checking ? "Verificando…" : "Verificar novamente"}
          </button>
          <button type="button" className="btn btn--secondary btn--block" onClick={() => void switchAccount()}>
            Entrar com outro e-mail
          </button>
        </div>

        <p className="auth__foot">
          Precisa de ajuda? <a href="mailto:mindvirtus24@gmail.com">mindvirtus24@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
