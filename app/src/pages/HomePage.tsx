import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RecentShowcase } from "@/components/content/RecentShowcase";
import { ContentGrid } from "@/components/content/ContentGrid";
import { GridSkeleton } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { listContent, listRecent } from "@/services/content.service";
import { readableError } from "@/lib/supabase";
import type { Content } from "@/types/models";

interface HomeData {
  recent: Content[];
  wallpapers: Content[];
  widgets: Content[];
}

export function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setStatus("loading");
    try {
      // Três consultas enxutas em paralelo, cada uma com seu limite.
      const [recent, wallpapers, widgets] = await Promise.all([
        listRecent(8, "wallpaper"),
        listContent({ type: "wallpaper", page: 0, pageSize: 8 }),
        listContent({ type: "widget", page: 0, pageSize: 4 }),
      ]);
      setData({ recent, wallpapers: wallpapers.items, widgets: widgets.items });
      setStatus("ready");
    } catch (caught) {
      setError(readableError(caught, "Falha ao carregar a home."));
      setStatus("error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <section className="wrap hero">
        <div className="label label--accent">Biblioteca digital · wallpapers e widgets</div>
        <h1>
          SEU AMBIENTE.
          <br />
          SUA MENTE.
          <br />
          SEU PROPÓSITO.
        </h1>
        <p className="lede">
          Wallpapers e widgets criados para transformar o ambiente que acompanha você todos os
          dias.
        </p>
        <div className="hero__cta">
          <Link className="btn btn--primary" to="/biblioteca">
            Ver a biblioteca
            <Icon name="arrowRight" />
          </Link>
        </div>
        <div className="hero__whisper">
          <i />
          Seu ambiente também fala com você.
        </div>
      </section>

      {status === "loading" && (
        <section className="wrap home-section">
          <GridSkeleton count={4} />
        </section>
      )}

      {status === "error" && (
        <div className="wrap">
          <ErrorState message={error ?? undefined} onRetry={() => void load()} />
        </div>
      )}

      {status === "ready" && data && (
        <>
          {data.recent.length > 0 ? (
            <RecentShowcase items={data.recent} />
          ) : (
            <div className="wrap">
              <EmptyState
                title="A biblioteca está sendo preparada"
                message="Os primeiros conteúdos aparecem aqui assim que forem publicados."
              />
            </div>
          )}

          {data.wallpapers.length > 0 && (
            <section className="wrap home-section">
              <div className="section-head">
                <div>
                  <div className="label">Biblioteca Virtus</div>
                  <h2>Wallpapers</h2>
                </div>
                <Link className="btn btn--secondary btn--sm" to="/biblioteca">
                  Ver a biblioteca
                  <Icon name="arrowRight" size={16} />
                </Link>
              </div>
              <ContentGrid items={data.wallpapers} />
            </section>
          )}

          {data.widgets.length > 0 && (
            <section className="wrap home-section">
              <div className="section-head">
                <div>
                  <div className="label">Widgets Virtus</div>
                  <h2>Widgets</h2>
                </div>
                <Link className="btn btn--secondary btn--sm" to="/widgets">
                  Ver os widgets
                  <Icon name="arrowRight" size={16} />
                </Link>
              </div>
              <ContentGrid items={data.widgets} widget />
            </section>
          )}
        </>
      )}

      <section className="wrap pillars">
        <div className="pillar">
          <div className="label">Curadoria</div>
          <h3>Uma coleção, não um catálogo.</h3>
          <p>Cada conteúdo entra por escolha. O que não combina com a biblioteca fica de fora.</p>
        </div>
        <div className="pillar">
          <div className="label">Identidade</div>
          <h3>Uma estética consistente.</h3>
          <p>
            Wallpapers e widgets que conversam entre si, para que a tela inteira tenha a mesma
            linguagem.
          </p>
        </div>
        <div className="pillar">
          <div className="label">Arquivo íntegro</div>
          <h3>Sem corte, sem distorção.</h3>
          <p>
            O download entrega o arquivo original, na proporção e na resolução em que foi criado.
          </p>
        </div>
      </section>
    </>
  );
}
