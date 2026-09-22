import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/feedback/ToastProvider";
import { readableError } from "@/lib/supabase";

export function SignupPage() {
  const { signUp, session } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  if (session) return <Navigate to="/biblioteca" replace />;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Use ao menos 8 caracteres na senha.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { needsConfirmation } = await signUp(email.trim(), password, displayName.trim());
      if (needsConfirmation) {
        setConfirmationSent(true);
      } else {
        notify("Conta criada.");
        navigate("/biblioteca", { replace: true });
      }
    } catch (caught) {
      setError(readableError(caught, "Não foi possível criar a conta."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="wrap">
      <div className="auth">
        <div>
          <div className="label label--accent">Acesso</div>
          <h1 style={{ marginTop: "var(--s-4)" }}>Criar conta</h1>
          <p className="lede" style={{ marginTop: "var(--s-3)" }}>
            Favoritos e downloads ficam vinculados à sua conta.
          </p>
        </div>

        {confirmationSent ? (
          <div className="notice notice--success">
            Enviamos um e-mail de confirmação para <b>{email}</b>. Confirme o endereço e volte para
            entrar.
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="displayName">Nome</label>
              <input
                id="displayName"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>

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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <span className="hint">Mínimo de 8 caracteres.</span>
            </div>

            {error && <p className="notice notice--error">{error}</p>}

            <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
              {pending ? "Criando…" : "Criar conta"}
            </button>
          </form>
        )}

        <p className="auth__foot">
          Já tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
