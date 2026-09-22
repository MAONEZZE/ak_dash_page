import { useState } from "react";
import { formatarNumero } from "../lib/formato";
import { serieDoTimePorMetrica } from "../lib/insights";
import type { Metrica, SerieDiariaDia } from "../lib/tipos-api";

/** Uma fonte de série (SDR ou Closer) — cada uma carrega sua própria serie_diaria e seu próprio conjunto de métricas. */
export interface FonteSerie {
  serieDiaria: SerieDiariaDia[];
  metricas: Metrica[];
}

interface Props {
  titulo: string;
  fontes: FonteSerie[];
}

const W = 900;
const H = 240;
const ALTURA_GRAFICO = 238;

/** Escala fixa do eixo Y (decisão de produto): 0 a 150, de 50 em 50 — não acompanha o maior valor da série. */
const MAX_Y = 150;
const PASSO_Y = 50;
/** Do topo (150) pra base (0) — é essa a ordem em que os rótulos aparecem. */
const TICKS_Y = Array.from({ length: MAX_Y / PASSO_Y + 1 }, (_, i) => MAX_Y - i * PASSO_Y);

function fracaoY(valor: number): number {
  return 1 - Math.min(Math.max(valor, 0), MAX_Y) / MAX_Y;
}

/**
 * O eixo X é o mês inteiro; a linha para em hoje.
 *
 * `serie` traz todos os dias do mês (a serie_diaria vem pré-zerada até o
 * último dia — ver comercial/banco.py) e `desenhados` diz quantos já
 * aconteceram. Desenhar os dias futuros faria a linha despencar a zero; tirá-los
 * do eixo encolheria o gráfico dia a dia até virar o mês.
 */
function geometria(serie: { dia: string; valor: number }[], desenhados: number) {
  const n = serie.length;
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (v: number) => fracaoY(v) * H;
  const pontos = serie.slice(0, desenhados).map((d, i) => `${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`);
  const area = `M${pontos.join(" L")} L${x(desenhados - 1).toFixed(1)},${H} L0,${H} Z`;
  return { linha: pontos.join(" "), area };
}

/** "01" -> "1": rótulo de dia do mês, sem o zero à esquerda. */
function diaDoMes(iso: string): string {
  return String(Number(iso.slice(8, 10)));
}

/**
 * Rótulo de dia: centrado no ponto, menos nas duas pontas — o primeiro
 * encostaria na coluna do eixo Y e o último sairia do card.
 */
function ancoragemDia(indice: number, total: number): string {
  if (indice === 0) return "translate-x-0";
  if (indice === total - 1) return "-translate-x-full";
  return "-translate-x-1/2";
}

/** Balão perto da borda sairia do card — encosta ele no ponto em vez de centralizar. */
function ancoragem(pctX: number): string {
  if (pctX < 12) return "translate-x-0";
  if (pctX > 88) return "-translate-x-full";
  return "-translate-x-1/2";
}

/**
 * Área+linha do redesenho novo_template. Sem linha de meta tracejada: o contrato só
 * entrega meta_periodo pro-rata até hoje, não uma meta linear do período inteiro
 * (ver docs/plans/novo-layout-template.md).
 *
 * A série é sempre a do MÊS CORRENTE (quem chama busca esse recorte, ver
 * `Comercial.tsx`), independente da pill de período da página: o eixo X são os
 * dias desse mês e o eixo Y é a escala fixa 0–150.
 */
export function GraficoAreaMeta({ titulo, fontes }: Props) {
  const opcoes = fontes.flatMap((fonte, indiceFonte) => fonte.metricas.map((m) => ({ ...m, indiceFonte })));
  const [selecionada, setSelecionada] = useState(() => opcoes[0]?.metrica ?? "");
  const [hover, setHover] = useState<number | null>(null);
  const atual = opcoes.find((o) => o.metrica === selecionada) ?? opcoes[0];

  if (!atual) {
    return (
      <article className="glass-panel flex flex-col gap-3 rounded-2xl px-[21px] pb-3 pt-[19px]">
        <span className="font-display text-4xl font-semibold tracking-tight">{titulo}</span>
        <p className="text-xl text-fg/60">Sem evolução diária lançada no mês corrente.</p>
      </article>
    );
  }

  const fonte = fontes[atual.indiceFonte];
  const serie = serieDoTimePorMetrica(fonte.serieDiaria, atual.metrica);
  const hojeIso = new Date().toISOString().slice(0, 10);
  const desenhados = serie.filter((d) => d.dia <= hojeIso).length;
  const geo = desenhados >= 2 ? geometria(serie, desenhados) : null;

  /** Dia mais próximo do cursor, limitado aos dias que já têm ponto desenhado. */
  function aoMover(evento: React.MouseEvent<HTMLDivElement>) {
    const caixa = evento.currentTarget.getBoundingClientRect();
    if (caixa.width === 0) return;
    const fracao = (evento.clientX - caixa.left) / caixa.width;
    const indice = Math.round(fracao * (serie.length - 1));
    setHover(Math.min(Math.max(indice, 0), desenhados - 1));
  }

  const pontoHover = hover === null ? null : serie[hover];
  const hoverPctX = hover === null ? 0 : (hover / (serie.length - 1)) * 100;

  return (
    <article className="glass-panel flex flex-col gap-4 rounded-2xl px-[21px] pb-3 pt-[19px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[17px] font-semibold uppercase tracking-[0.13em] text-fg/56">Acompanhamento de metas</span>
          <span className="font-display text-4xl font-semibold tracking-tight">{titulo}</span>
        </div>
        <label className="flex items-center gap-2 text-lg text-fg/70">
          Métrica
          <select
            value={atual.metrica}
            onChange={(e) => setSelecionada(e.target.value)}
            className="rounded-md border border-glass-border bg-glass-bg px-2 py-1 text-xl text-fg"
          >
            {opcoes.map((o) => (
              <option key={o.metrica} value={o.metrica}>
                {o.nome_exibicao}
              </option>
            ))}
          </select>
        </label>
      </div>

      <span className="flex items-center gap-2 text-lg text-fg/70">
        <span className="inline-block h-[3px] w-4 bg-accent-fg" /> Realizado
      </span>

      {geo ? (
        <div className="flex gap-2 pb-1.5">
          {/* Rótulos do Y em HTML, não em <text>: o SVG estica sem manter
              proporção (preserveAspectRatio="none") e deformaria a tipografia.
              O `top` em % é o mesmo `fracaoY` das linhas de grade, então
              rótulo e linha ficam sempre alinhados. */}
          <div className="relative w-[30px] shrink-0" style={{ height: ALTURA_GRAFICO }} data-eixo="y" aria-hidden>
            {TICKS_Y.map((v) => (
              <span
                key={v}
                className="absolute right-0 -translate-y-1/2 text-[15px] font-medium text-fg/50"
                style={{ top: `${fracaoY(v) * 100}%` }}
              >
                {v}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            {/* O mouse é ouvido na caixa do plot inteiro, não em cada ponto: o dia
                mais próximo do cursor é quem responde, então não é preciso
                acertar um alvo de poucos pixels. */}
            <div className="relative" style={{ height: ALTURA_GRAFICO }} onMouseMove={aoMover} onMouseLeave={() => setHover(null)}>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
                {TICKS_Y.map((v) => (
                  <line key={v} x1={0} x2={W} y1={fracaoY(v) * H} y2={fracaoY(v) * H} className="stroke-border-2" strokeWidth={1} />
                ))}
                <path d={geo.area} className="fill-accent/30" />
                <polyline
                  points={geo.linha}
                  fill="none"
                  className="stroke-accent-fg"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {pontoHover && (
                  <line
                    x1={(hoverPctX / 100) * W}
                    x2={(hoverPctX / 100) * W}
                    y1={0}
                    y2={H}
                    className="stroke-fg/35"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>

              {pontoHover && (
                <>
                  {/* Ponto e balão em HTML, fora do SVG: com `preserveAspectRatio="none"`
                      um <circle> sairia como elipse e o texto, esticado. */}
                  <span
                    className="pointer-events-none absolute h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-fg"
                    style={{ left: `${hoverPctX}%`, top: `${fracaoY(pontoHover.valor) * 100}%` }}
                  />
                  <div
                    role="tooltip"
                    className={`pointer-events-none absolute top-0 ${ancoragem(hoverPctX)} flex flex-col gap-0.5 whitespace-nowrap rounded-lg border border-border-2 bg-bg-2/95 px-3 py-2`}
                    style={{ left: `${hoverPctX}%` }}
                  >
                    <span className="text-[14px] font-semibold uppercase tracking-[0.08em] text-fg/55">Dia {diaDoMes(pontoHover.dia)}</span>
                    <span className="font-display text-[22px] font-extrabold leading-none tracking-tight">
                      {formatarNumero(pontoHover.valor)}
                    </span>
                  </div>
                </>
              )}
            </div>
            {/*
             * Cada rótulo é ancorado na MESMA fração que o ponto daquele dia, não
             * distribuído por `justify-between`: com larguras diferentes ("1" vs
             * "20") o flex empurrava o número até 40px pra esquerda do ponto dele,
             * e quem mirasse o cursor no rótulo "20" caía no dia 19 ou 18.
             * A fonte encolhe com a largura do card pra caber o mês inteiro.
             */}
            <div className="relative h-[19px]" data-eixo="x">
              {serie.map((d, i) => {
                const pctX = (i / (serie.length - 1)) * 100;
                return (
                  <span
                    key={d.dia}
                    className={`absolute top-0 ${ancoragemDia(i, serie.length)} text-[clamp(9px,1.05vw,15px)] font-medium leading-none text-fg/50`}
                    style={{ left: `${pctX}%` }}
                  >
                    {diaDoMes(d.dia)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xl text-fg/60">Sem evolução diária lançada no mês corrente.</p>
      )}
    </article>
  );
}
