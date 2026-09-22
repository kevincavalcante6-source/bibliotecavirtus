import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Icon } from "@/components/ui/Icon";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { useToast } from "@/components/feedback/ToastProvider";
import { useAsyncData } from "@/hooks/useAsyncData";
import { countFavorites } from "@/services/favorites.service";
import { countDownloads } from "@/services/downloads.service";
import { readableError } from "@/lib/supabase";
import { formatDate, formatNumber } from "@/lib/format";

export function ProfilePage() {
  const { user, profile, isAdmin, updateDisplayName, signOut } = useAuth();
  const { notify, notifyError } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setName(profile.display_name);
  }, [profile]);

  const { data, status, error, reload } = useAsyncData(
    async () =>
      user
        ? {
            favorites: await countFavorites(user.id),
            downloads: await countDownloads(user.id),
          }
        : { favorites: 0, downloads: 0 },
    [user?.id],
  );

  if (!profile) return <LoadingState label="Carregando seu perfil" />;

  const initials = (profile.display_name || profile.email)
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      notifyError("Use ao menos 2 caracteres.");
      return;
    }
    setSaving(true);
    try {
      await updateDisplayName(trimmed);
      notify("Nome atualizado.");
    } catch (caught) {
      notifyError(readableError(caught, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  }

  async function onSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <section className="wrap page-head" style={{ paddingBottom: "var(--s-10)" }}>
      <div className="label label--accent">Sua conta</div>

      <div className="profile-head" style={{ marginTop: "var(--s-6)" }}>
        <div className="avatar" aria-hidden="true">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials}
        </div>
        <div>
          <h1 style={{ fontSize: 32, marginTop: 0 }}>{profile.display_name || "Sem nome"}</h1>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>{profile.email}</p>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Na Virtus desde {formatDate(profile.created_at)}
            {isAdmin && " · administrador"}
          </p>
        </div>
      </div>

      {status === "loading" && <LoadingState label="Carregando seus números" />}
      {status === "error" && <ErrorState message={error ?? undefined} onRetry={reload} compact />}
      {status === "ready" && data && (
        <div className="counters">
          <Link to="/favoritos" className="counter">
            <b>{formatNumber(data.favorites)}</b>
            <span>Favoritos</span>
          </Link>
          <Link to="/downloads" className="counter">
            <b>{formatNumber(data.downloads)}</b>
            <span>Downloads</span>
          </Link>
        </div>
      )}

      <form onSubmit={onSave} style={{ marginTop: "var(--s-8)", maxWidth: 420, display: "grid", gap: "var(--s-4)" }}>
        <div className="field">
          <label htmlFor="displayName">Nome de exibição</label>
          <input
            id="displayName"
            type="text"
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
          />
          <span className="hint">E-mail e permissões não são editáveis por aqui.</span>
        </div>
        <button type="submit" className="btn btn--primary" disabled={saving || name === profile.display_name}>
          {saving ? "Salvando…" : "Salvar nome"}
        </button>
      </form>

      <div style={{ marginTop: "var(--s-8)", display: "flex", flexWrap: "wrap", gap: "var(--s-3)" }}>
        {isAdmin && (
          <Link className="btn btn--secondary" to="/admin">
            <Icon name="shield" size={18} />
            Área administrativa
          </Link>
        )}
        <button type="button" className="btn btn--secondary btn--danger" onClick={() => void onSignOut()}>
          <Icon name="logout" size={18} />
          Sair da conta
        </button>
      </div>
    </section>
  );
}
