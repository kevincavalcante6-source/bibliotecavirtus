import { NavLink, Link, Outlet } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/auth/AuthProvider";

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? "is-active" : undefined);

export function AppShell() {
  const { session, isAdmin, hasAccess } = useAuth();

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Link className="brand" to="/" aria-label="Biblioteca Virtus — início">
            <b>BIBLIOTECA VIRTUS</b>
            <span>VIRTUS MIND</span>
          </Link>

          <nav className="top-nav">
            {hasAccess && (
              <>
                <NavLink to="/biblioteca" className={navClass}>
                  Biblioteca
                </NavLink>
                <NavLink to="/widgets" className={navClass}>
                  Widgets
                </NavLink>
                <NavLink to="/favoritos" className={navClass}>
                  Favoritos
                </NavLink>
              </>
            )}
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

          {hasAccess ? (
            <NavLink className="icon-btn" to="/biblioteca" aria-label="Buscar na biblioteca">
              <Icon name="search" />
            </NavLink>
          ) : (
            <NavLink className="btn btn--secondary btn--sm site-header__enter" to={session ? "/perfil" : "/login"}>
              {session ? "Perfil" : "Entrar"}
            </NavLink>
          )}
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="wrap site-footer__top">
          <div className="site-footer__brand">
            <div className="site-footer__mark">BIBLIOTECA VIRTUS</div>
            <p>Virtus Mind</p>
          </div>

          <div className="site-footer__cols">
            <nav aria-labelledby="rodape-navegacao">
              <h2 id="rodape-navegacao" className="site-footer__title">
                Navegação
              </h2>
              <ul>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/biblioteca">Biblioteca</Link>
                </li>
                <li>
                  <Link to="/widgets">Widgets</Link>
                </li>
                <li>
                  {session ? <Link to="/perfil">Perfil</Link> : <Link to="/login">Entrar</Link>}
                </li>
              </ul>
            </nav>

            <div>
              <h2 className="site-footer__title">Redes sociais</h2>
              <ul>
                <li>
                  <a
                    href="https://instagram.com/_virtusmind"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    @_virtusmind
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="site-footer__title">Contato</h2>
              <ul>
                <li>
                  <a href="mailto:mindvirtus24@gmail.com">
                    <Icon name="mail" size={16} />
                    mindvirtus24@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="wrap">
          <p className="site-footer__bottom">
            © {new Date().getFullYear()} Virtus Mind. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {hasAccess && (
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
      )}
    </>
  );
}
