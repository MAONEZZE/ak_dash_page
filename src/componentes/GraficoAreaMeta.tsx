import { useState } from "react";
import { serieAteHoje, serieDoTimePorMetrica } from "../lib/insights";
import type { Granularidade, Metrica, SerieDiariaDia } from "../lib/tipos-api";

/** Uma fonte de série (SDR ou Closer) — cada uma carrega sua própria serie_diaria e seu próprio conjunto de métricas. */
export interface FonteSerie {
  serieDiaria: SerieDiariaDia[];
  metricas: Metrica[];
}

interface Props {
  titulo: string;
  fontes: FonteSerie[];
  granularidade: Granularidade;
}

const W = 900;
const H = 240;
const PL = 8;
const PR = 8;
const PT = 14;
const PB = 22;

function geometria(serie: { dia: string; valor: number }[]) {
  const n = serie.length;
  const max = Math.max(...serie.map((d) => d.valor), 1) * 1.08;
  const x = (i: number) => PL + (i / (n - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
  const pontos = serie.map((d, i) => `${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`);
  const area = `M${pontos.join(" L")} L${x(n - 1).toFixed(1)},${H - PB} L${PL},${H - PB} Z`;
  const grade = [0.25, 0.5, 0.75, 1].map((f) => y(max * f));
  const nTicks = Math.min(7, n);
  const ticks = Array.from({ length: nTicks }, (_, i) => {
    const idx = nTicks === 1 ? 0 : Math.round((i * (n - 1)) / (nTicks - 1));
    return { rotulo: serie[idx].dia.slice(8, 10), x: x(idx) };
  });
  return { linha: pontos.join(" "), area, grade, ticks };
}

/**
 * Área+linha do redesenho novo_template. Sem linha de meta tracejada: o contrato só
 * entrega meta_periodo pro-rata até hoje, não uma meta linear do período inteiro
 * (ver docs/plans/novo-layout-template.md).
 */
export function GraficoAreaMeta({ titulo, fontes, granularidade }: Props) {
  const opcoes = fontes.flatMap((fonte, indiceFonte) => fonte.metricas.map((m) => ({ ...m, indiceFonte })));
  const [selecionada, setSelecionada] = useState(() => opcoes[0]?.metrica ?? "");
  const atual = opcoes.find((o) => o.metrica === selecionada) ?? opcoes[0];

  if (!atual) {
    return (
      <article className="glass-panel flex flex-col gap-3 rounded-2xl px-[21px] pb-3 pt-[19px]">
        <span className="font-display text-4xl font-semibold tracking-tight">{titulo}</span>
        <p className="text-xl text-fg/60">Sem evolução diária pro período selecionado (só cobre o mês corrente).</p>
      </article>
    );
  }

  const fonte = fontes[atual.indiceFonte];
  const serieBase = serieDoTimePorMetrica(fonte.serieDiaria, atual.metrica);
  const hojeIso = new Date().toISOString().slice(0, 10);
  const serie = granularidade === "dia" ? serieAteHoje(serieBase, hojeIso) : serieBase;
  const geo = serie.length >= 2 ? geometria(serie) : null;

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
        <>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[238px] w-full overflow-visible">
            {geo.grade.map((yy, i) => (
              <line key={i} x1={PL} x2={W - PR} y1={yy} y2={yy} className="stroke-border-2" strokeWidth={1} />
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
          </svg>
          <div className="flex justify-between px-1 pb-1.5">
            {geo.ticks.map((t, i) => (
              <span key={i} className="text-[17px] font-medium text-fg/50">
                {t.rotulo}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xl text-fg/60">Sem evolução diária pro período selecionado (só cobre o mês corrente).</p>
      )}
    </article>
  );
}
