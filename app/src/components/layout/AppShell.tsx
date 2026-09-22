import { NavLink, Link, Outlet } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/auth/AuthProvider";

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? "is-active" : undefined);

export function AppShell() {
  const { session, isAdmin } = useAuth();

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Link className="brand" to="/" aria-label="Biblioteca Virtus — início">
            <b>BIBLIOTECA VIRTUS</b>
            <span>VIRTUS MIND</span>
          </Link>

          <nav className="top-nav">
            <NavLink to="/biblioteca" className={navClass}>
              Biblioteca
            </NavLink>
            <NavLink to="/widgets" className={navClass}>
              Widgets
            </NavLink>
            <NavLink to="/favoritos" className={navClass}>
              Favoritos
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navClass}>
                Admin
              </NavLink>
            )}
            {session ? (
              <NavLink to="/perfil" className="btn btn--secondary btn--sm">
                Perfil
              </NavLink>
            ) : (
              <NavLink to="/login" className="btn btn--secondary btn--sm">
                Entrar
              </NavLink>
            )}
          </nav>

          <NavLink className="icon-btn" to="/biblioteca" aria-label="Buscar na biblioteca">
            <Icon name="search" />
          </NavLink>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.16em" }}>
              BIBLIOTECA VIRTUS
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>Virtus Mind</div>
          </div>
          <div className="links">
            <Link to="/biblioteca">Biblioteca</Link>
            <Link to="/widgets">Widgets</Link>
            <Link to="/favoritos">Favoritos</Link>
            <Link to="/downloads">Meus downloads</Link>
          </div>
        </div>
      </footer>

      <nav className="tabbar" aria-label="Navegação principal">
        <NavLink to="/" end className={navClass}>
          <Icon name="home" size={20} />
          Início
        </NavLink>
        <NavLink to="/biblioteca" className={navClass}>
          <Icon name="search" size={20} />
          Buscar
        </NavLink>
        <NavLink to="/favoritos" className={navClass}>
          <Icon name="heart" size={20} />
          Favoritos
        </NavLink>
        <NavLink to={session ? "/perfil" : "/login"} className={navClass}>
          <Icon name="user" size={20} />
          {session ? "Perfil" : "Entrar"}
        </NavLink>
      </nav>
    </>
  );
}
