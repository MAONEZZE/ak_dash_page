import type { CSSProperties } from "react";
import { Droplet, Flame, Snowflake } from "lucide-react";
import { formatarMoeda } from "../lib/formato";
import type { Termometro as DadoTermometro } from "../lib/tipos-api";

export type Temperatura = "frio" | "medio" | "quente";

/** Faixas em % da meta (decisão do usuário, 2026-10-05): frio < 40, médio 40–79, quente ≥ 80. */
export function temperatura(pct: number): Temperatura {
  if (pct < 40) return "frio";
  if (pct < 80) return "medio";
  return "quente";
}

const VISUAL: Record<Temperatura, { rotulo: string; preenchimento: string; rgb: string }> = {
  frio: { rotulo: "Frio", preenchimento: "bg-gelo", rgb: "var(--color-gelo-rgb)" },
  medio: { rotulo: "Esquentando", preenchimento: "bg-warn-bar", rgb: "var(--color-warn-barra-rgb)" },
  quente: { rotulo: "Pegando fogo", preenchimento: "bg-fogo", rgb: "var(--color-fogo-rgb)" },
};

/** Partículas quase brancas; o halo (--halo-rgb, ver .termometro-particula) carrega a cor. */
const HALO_GELO = { ["--halo-rgb" as string]: "var(--color-gelo-rgb)" };
const HALO_FOGO = { ["--halo-rgb" as string]: "var(--color-fogo-rgb)" };

const MARCAS = [100, 75, 50, 25, 0];

const moedaCompacta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 0,
});

/**
 * Posição/ritmo fixos de cada partícula (left %, atraso s, duração s, tamanho
 * px) — fixos e não aleatórios pra a cena não mudar a cada render.
 */
const PARTICULAS: [number, number, number, number][] = [
  [6, 0, 7, 28],
  [18, 2.4, 8.5, 20],
  [30, 4.1, 6.5, 34],
  [44, 1.2, 9, 22],
  [57, 3.3, 7.5, 30],
  [70, 0.6, 8, 20],
  [82, 2.9, 6.8, 28],
  [90, 5, 9.5, 22],
];

function estiloParticula([esquerda, atraso, duracao, tamanho]: [number, number, number, number], queda: string): CSSProperties {
  return {
    left: `${esquerda}%`,
    width: tamanho,
    height: tamanho,
    ["--atraso" as string]: `${atraso}s`,
    ["--dur" as string]: `${duracao}s`,
    ["--queda" as string]: queda,
  };
}

/** Cena de fundo do card: neve caindo, neve derretendo em gotas, ou chamas subindo. */
function Cena({ temp }: { temp: Temperatura }) {
  if (temp === "frio") {
    return PARTICULAS.map((p, i) => (
      <Snowflake key={i} className="termometro-particula neve-caindo top-0 text-gelo-claro" style={{ ...estiloParticula(p, "60vh"), ...HALO_GELO }} aria-hidden />
    ));
  }
  if (temp === "medio") {
    return PARTICULAS.map((p, i) =>
      i % 2 === 0 ? (
        <Snowflake key={i} className="termometro-particula neve-derretendo top-0 text-gelo-claro" style={{ ...estiloParticula(p, "50vh"), ...HALO_GELO }} aria-hidden />
      ) : (
        <Droplet key={i} className="termometro-particula gota-pingando top-[20%] text-gelo-claro" style={{ ...estiloParticula(p, "45vh"), ...HALO_GELO }} aria-hidden />
      ),
    );
  }
  return PARTICULAS.map((p, i) => (
    <Flame key={i} className="termometro-particula chama-subindo bottom-0 text-fogo-claro" style={{ ...estiloParticula([p[0], p[1] / 2, p[2] / 2, p[3] + 6], "40vh"), ...HALO_FOGO }} aria-hidden />
  ));
}

const ICONE_BULBO: Record<Temperatura, typeof Flame> = { frio: Snowflake, medio: Droplet, quente: Flame };

/**
 * Faturamento do mês corrente contra a meta de faturamento — independente do
 * filtro de data da página. O mercúrio sobe até a meta; passou dela, o tubo
 * fica cheio e o percentual mostra quanto passou. A cor e a cena de fundo
 * seguem a temperatura (ver `temperatura`).
 */
export function Termometro({ dado }: { dado: DadoTermometro | null }) {
  if (!dado || dado.meta <= 0) {
    return (
      <article className="card-pastel pastel-verde-escuro flex min-h-0 min-w-0 flex-1 flex-col rounded-[24px] p-[clamp(10px,1.4vh,18px)]" aria-label="Termômetro de faturamento">
        <span className="text-[clamp(13px,1.55vh,22px)] font-semibold uppercase leading-none tracking-[0.13em] text-muted">Termômetro</span>
        <p className="mt-2 text-[clamp(13px,1.6vh,24px)] text-muted">Sem dado de faturamento.</p>
      </article>
    );
  }

  const pct = (dado.realizado / dado.meta) * 100;
  const altura = Math.min(Math.max(pct, 0), 100);
  const temp = temperatura(pct);
  const visual = VISUAL[temp];
  const IconeBulbo = ICONE_BULBO[temp];

  return (
    <article
      className="card-pastel pastel-verde-escuro relative flex min-h-0 min-w-0 flex-1 flex-col gap-[clamp(6px,1vh,14px)] overflow-hidden rounded-[24px] p-[clamp(10px,1.4vh,18px)]"
      aria-label="Termômetro de faturamento"
      data-temperatura={temp}
    >
      {/* Brilho da temperatura no meio do card: quase branco, puxado pra cor da temperatura. */}
      <div
        className={`pointer-events-none absolute inset-0 transition-[background] duration-700 ${temp === "quente" ? "brilho-pulsando" : ""}`}
        style={{
          background: `radial-gradient(60% 45% at 50% 50%, rgb(${visual.rgb} / 18%), transparent 100%), radial-gradient(60% 45% at 50% 50%, rgb(var(--color-offwhite-rgb) / 20%), transparent 100%)`,
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <Cena temp={temp} />
      </div>

      <div className="relative flex items-center justify-between gap-2">
        <span className="text-[clamp(13px,1.55vh,22px)] font-semibold uppercase leading-none tracking-[0.13em] text-muted">Termômetro</span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[clamp(11px,1.3vh,18px)] font-bold uppercase leading-none tracking-[0.06em] text-ink ${visual.preenchimento}`}
        >
          <IconeBulbo className="size-[1.1em]" aria-hidden />
          {visual.rotulo}
        </span>
      </div>

      <div className="relative flex min-h-0 flex-1 items-stretch justify-center gap-[clamp(10px,1.2vw,24px)]">
        {/* Escala: 0–100% da meta. */}
        <div className="flex flex-col justify-between pb-[clamp(30px,4.4vh,64px)] text-right text-[clamp(10px,1.2vh,16px)] font-semibold text-muted" aria-hidden>
          {MARCAS.map((m) => (
            <span key={m} className="leading-none">
              {moedaCompacta.format((dado.meta * m) / 100)}
            </span>
          ))}
        </div>
        <div
          role="meter"
          aria-label={`Faturamento do mês: ${formatarMoeda(dado.realizado)} de ${formatarMoeda(dado.meta)}`}
          aria-valuenow={dado.realizado}
          aria-valuemin={0}
          aria-valuemax={dado.meta}
          className="flex min-h-0 flex-col items-center"
        >
          <div className="relative min-h-0 w-[clamp(18px,1.8vh,30px)] flex-1 overflow-hidden rounded-t-full bg-track shadow-[inset_0_2px_4px_rgb(0_0_0/12%)]">
            <div
              className={`absolute bottom-0 left-0 right-0 rounded-t-full transition-[height,background-color] duration-1000 ease-out ${visual.preenchimento}`}
              style={{ height: `${altura}%` }}
            />
          </div>
          {/*
           * Bulbo sempre opaco (pedido do usuário, 2026-10-05): cor pelos canais
           * RGB, sem a indireção --color-gelo → --gelo, e acima das partículas.
           */}
          <div
            className="relative z-10 -mt-1 flex size-[clamp(34px,4.6vh,66px)] shrink-0 items-center justify-center rounded-full text-surface opacity-100 transition-colors duration-1000"
            style={{ backgroundColor: `rgb(${visual.rgb})` }}
          >
            <IconeBulbo className={`size-[55%] ${temp === "quente" ? "chama-tremulando" : ""}`} aria-hidden />
          </div>
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-[clamp(4px,0.8vh,10px)]">
          {/* Teto em vw por grade da Geral (1, 2 ou 4 colunas): em 2 colunas estreitas a moeda passava do card. */}
          <span className="font-display text-[clamp(18px,min(3vh,6.5vw),48px)] font-extrabold sm:text-[clamp(18px,min(3vh,3.4vw),48px)] xl:text-[clamp(18px,min(3vh,1.7vw),48px)] leading-none tracking-tight">{formatarMoeda(dado.realizado)}</span>
          <span className="text-[clamp(13px,1.6vh,24px)] font-semibold leading-tight text-muted">de {formatarMoeda(dado.meta)}</span>
          <span className={`text-[clamp(13px,1.6vh,24px)] font-bold leading-tight text-offwhite`}>{Math.round(pct)}% da meta</span>
        </div>
      </div>
    </article>
  );
}
