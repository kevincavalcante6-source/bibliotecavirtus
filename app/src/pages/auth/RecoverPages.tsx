import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/feedback/ToastProvider";
import { readableError } from "@/lib/supabase";

/** Pedido do link de recuperação (o e-mail é enviado pelo próprio Supabase). */
export function RecoverPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (caught) {
      setError(readableError(caught, "Não foi possível enviar o e-mail."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <div className="auth">
        <div>
          <div className="label label--accent">Acesso</div>
          <h1 style={{ marginTop: "var(--s-4)" }}>Recuperar acesso</h1>
          <p className="lede" style={{ marginTop: "var(--s-3)" }}>
            Enviamos um link para você definir uma nova senha.
          </p>
        </div>

        {sent ? (
          <div className="notice notice--success">
            Se existir uma conta para <b>{email}</b>, o link de recuperação chegará em instantes.
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {error && <p className="notice notice--error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        )}

        <p className="auth__foot">
          <Link to="/login">Voltar para o login</Link>
        </p>
      </div>
    </div>
  );
}

/** Destino do link do e-mail: a sessão de recuperação já chega ativa. */
export function NewPasswordPage() {
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Use ao menos 8 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      notify("Senha atualizada.");
      navigate("/perfil", { replace: true });
    } catch (caught) {
      setError(readableError(caught, "Não foi possível atualizar a senha."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <div className="auth">
        <div>
          <div className="label label--accent">Acesso</div>
          <h1 style={{ marginTop: "var(--s-4)" }}>Nova senha</h1>
        </div>

        {!session ? (
          <div className="notice">
            Abra esta página pelo link enviado ao seu e-mail para redefinir a senha.
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="password">Nova senha</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error && <p className="notice notice--error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? "Salvando…" : "Salvar senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
