import { NavLink, Outlet } from "react-router-dom";

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? "is-active" : undefined);

export function AdminLayout() {
  return (
    <section className="wrap page-head" style={{ paddingBottom: "var(--s-10)" }}>
      <div className="label label--accent">Administração</div>
      <h1>Biblioteca Virtus</h1>
      <p className="lede">Painel, acervo, envio individual e envio em massa. Todos os números são reais.</p>

      <nav className="admin-tabs" style={{ marginTop: "var(--s-7)" }}>
        <NavLink to="/admin" end className={navClass}>
          Painel
        </NavLink>
        <NavLink to="/admin/conteudos" className={navClass}>
          Conteúdos
        </NavLink>
        <NavLink to="/admin/upload" className={navClass}>
          Enviar conteúdo
        </NavLink>
        <NavLink to="/admin/upload-em-massa" className={navClass}>
          Envio em massa
        </NavLink>
      </nav>

      <div style={{ marginTop: "var(--s-7)" }}>
        <Outlet />
      </div>
    </section>
  );
}
