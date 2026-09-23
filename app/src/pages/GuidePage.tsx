import { useState } from "react";
import { Link } from "react-router-dom";
import { isAppleMobile } from "@/lib/device";

type Platform = "iphone" | "android";

interface Step {
  title: string;
  body: string[];
  note?: string;
}

/**
 * Passos gerais. Os nomes dos menus mudam um pouco entre versões do sistema e,
 * no Android, entre marcas — o texto diz isso em vez de prometer um caminho único.
 */
const STEPS: Record<Platform, Step[]> = {
  iphone: [
    {
      title: "Salvar a imagem",
      body: [
        "Abra o wallpaper ou widget e toque em Baixar.",
        "No menu que aparece, toque em “Salvar imagem”. Ela vai direto para o app Fotos, na resolução original.",
      ],
      note: "Se o arquivo abrir no app Arquivos, toque no botão de compartilhar e depois em “Salvar imagem”.",
    },
    {
      title: "Definir como papel de parede",
      body: [
        "No app Fotos, abra a imagem e toque no botão de compartilhar.",
        "Escolha “Usar como Papel de Parede”, ajuste se quiser e toque em Adicionar.",
        "Escolha se ela vale para a tela bloqueada, para a tela de início ou para as duas.",
      ],
    },
    {
      title: "Colocar um widget",
      body: [
        "Salve a imagem do widget nas Fotos, como no primeiro passo.",
        "Baixe o app Widgetsmith na App Store.",
        "No Widgetsmith, crie um widget no tamanho que quiser (pequeno, médio ou grande), escolha o estilo de foto e selecione a imagem salva.",
        "Na tela de início, toque e segure num espaço vazio e toque em Editar → Adicionar Widget (ou no +). Procure o Widgetsmith e adicione no mesmo tamanho.",
      ],
      note: "Se aparecer um widget diferente, toque e segure nele, toque em Editar Widget e escolha o que você criou.",
    },
    {
      title: "Ter a Biblioteca como aplicativo",
      body: [
        "Abra a Biblioteca Virtus no Safari.",
        "Toque no botão de compartilhar e em “Adicionar à Tela de Início”.",
        "O ícone da Virtus aparece junto dos seus apps e abre em tela cheia.",
      ],
      note: "Na primeira vez que abrir pelo ícone, entre com o seu e-mail e senha.",
    },
  ],
  android: [
    {
      title: "Salvar a imagem",
      body: [
        "Abra o wallpaper ou widget e toque em Baixar.",
        "O arquivo vai para a pasta Downloads e aparece na Galeria ou no Google Fotos, na resolução original.",
      ],
    },
    {
      title: "Definir como papel de parede",
      body: [
        "Abra a imagem na Galeria ou no Google Fotos e toque no menu (⋮).",
        "Escolha “Usar como” ou “Definir como plano de fundo”.",
        "Escolha tela inicial, tela de bloqueio ou as duas.",
      ],
      note: "O nome das opções muda um pouco conforme a marca do celular.",
    },
    {
      title: "Colocar um widget",
      body: [
        "Toque e segure num espaço vazio da tela inicial e toque em Widgets.",
        "Escolha um widget de foto — do Google Fotos, da Galeria do celular ou de um app de widget de foto.",
        "Selecione a imagem do widget que você baixou.",
      ],
    },
    {
      title: "Ter a Biblioteca como aplicativo",
      body: [
        "Abra a Biblioteca Virtus no Chrome e toque no menu (⋮).",
        "Toque em “Instalar app” ou “Adicionar à tela inicial”.",
        "O ícone da Virtus aparece junto dos seus apps e abre em tela cheia.",
      ],
      note: "Na primeira vez que abrir pelo ícone, pode ser preciso entrar com o seu e-mail e senha.",
    },
  ],
};

function initialPlatform(): Platform {
  if (isAppleMobile()) return "iphone";
  return /Android/i.test(navigator.userAgent) ? "android" : "iphone";
}

export function GuidePage() {
  const [platform, setPlatform] = useState<Platform>(initialPlatform);

  return (
    <>
      <section className="wrap page-head">
        <div className="label label--accent">Guia rápido</div>
        <h1>Como aplicar</h1>
        <p className="lede">Do download até a tela do seu celular, em poucos passos.</p>

        <div className="segmented" role="tablist" aria-label="Sistema do celular" style={{ marginTop: "var(--s-6)" }}>
          {(["iphone", "android"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={platform === option}
              className={platform === option ? "is-active" : undefined}
              onClick={() => setPlatform(option)}
            >
              {option === "iphone" ? "iPhone" : "Android"}
            </button>
          ))}
        </div>
      </section>

      <section className="wrap guide" style={{ paddingBottom: "var(--s-10)" }}>
        <ol className="guide__list">
          {STEPS[platform].map((step, index) => (
            <li key={step.title} className="guide__step">
              <span className="guide__index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{step.title}</h2>
                <ul>
                  {step.body.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {step.note && <p className="guide__note">{step.note}</p>}
              </div>
            </li>
          ))}
        </ol>

        <p className="guide__foot">
          Ficou alguma dúvida? Escreva para <a href="mailto:mindvirtus24@gmail.com">mindvirtus24@gmail.com</a>.
          <br />
          <Link to="/biblioteca">Voltar à biblioteca</Link>
        </p>
      </section>
    </>
  );
}
