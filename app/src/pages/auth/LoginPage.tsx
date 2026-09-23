import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/feedback/ToastProvider";
import { readableError } from "@/lib/supabase";

export function LoginPage() {
  const { signIn, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";
  if (session) return <Navigate to={from} replace />;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      notify("Bem-vindo de volta.");
      navigate(from, { replace: true });
    } catch (caught) {
      setError(readableError(caught, "Não foi possível entrar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <div className="auth">
        <div>
          <div className="label label--accent">Biblioteca Virtus</div>
          <h1 style={{ marginTop: "var(--s-4)" }}>Entrar</h1>
          <p className="lede" style={{ marginTop: "var(--s-3)" }}>
            Acesso exclusivo de quem adquiriu a Biblioteca Virtus. Entre com o e-mail usado
            na compra.
          </p>
        </div>

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

          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && <p className="notice notice--error">{error}</p>}

          <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="auth__foot">
          <Link to="/recuperar">Esqueci minha senha</Link>
        </p>
        <p className="auth__foot">
          Primeiro acesso depois da compra? <Link to="/cadastro">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
