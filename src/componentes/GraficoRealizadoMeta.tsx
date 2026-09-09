import { useState } from "react";
import { formatarNumero } from "../lib/formato";
import type { MetricaAgregada } from "../lib/insights";

interface Props {
  metricas: MetricaAgregada[];
}

type Modo = "absoluto" | "percentual";

// Geometria fixa do mockup: viewBox 760×330, margens L52 R14 T22 B104.
const VB_W = 760;
const VB_H = 330;
const L = 52;
const R = 14;
const T = 22;
const B = 104;
const PLOT_W = VB_W - L - R;
const PLOT_H = VB_H - T - B;
const PLOT_BOTTOM = T + PLOT_H;
const DIVISOES = 4;

export function GraficoRealizadoMeta({ metricas }: Props) {
  const [modo, setModo] = useState<Modo>("absoluto");

  const dados = metricas.filter((m) => !m.naoDisponivel && m.meta > 0);

  if (dados.length === 0) {
    return <p className="text-sm text-fg/60">Sem meta cadastrada pra comparar no período.</p>;
  }

  const valores = dados.map((d) => ({
    ...d,
    metaValor: modo === "percentual" ? 100 : d.meta,
    realizadoValor: modo === "percentual" ? (d.realizado / d.meta) * 100 : d.realizado,
  }));

  const maiorValor = Math.max(...valores.map((v) => Math.max(v.metaValor, v.realizadoValor)));
  const domainMax = modo === "percentual" ? Math.max(110, maiorValor) : maiorValor * 1.05;

  const passo = PLOT_W / dados.length;
  const bw = Math.min(46, passo * 0.52);
  const realizadoWidth = bw - 10;

  function y(valor: number): number {
    return domainMax > 0 ? PLOT_BOTTOM - (valor / domainMax) * PLOT_H : PLOT_BOTTOM;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <label className="flex items-center gap-2 text-xs text-fg/70">
          Modo
          <select
            value={modo}
            onChange={(e) => setModo(e.target.value as Modo)}
            className="rounded-md border border-border-2 bg-bg-2 px-2 py-1 text-sm text-fg"
          >
            <option value="absoluto">Absoluto</option>
            <option value="percentual">% da meta</option>
          </select>
        </label>
      </div>

      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full" role="img" aria-label="Realizado comparado à meta, por métrica">
        {Array.from({ length: DIVISOES + 1 }, (_, i) => {
          const valor = (domainMax / DIVISOES) * i;
          const yy = y(valor);
          return (
            <g key={i}>
              <line x1={L} x2={L + PLOT_W} y1={yy} y2={yy} className="stroke-border-2" strokeWidth={1} />
              <text x={L - 8} y={yy} textAnchor="end" dominantBaseline="middle" className="fill-fg/60 text-[11px] tabular-nums">
                {modo === "percentual" ? `${Math.round(valor)}%` : formatarNumero(Math.round(valor))}
              </text>
            </g>
          );
        })}

        {modo === "percentual" && (
          <line x1={L} x2={L + PLOT_W} y1={y(100)} y2={y(100)} className="stroke-border-forte" strokeWidth={2} />
        )}

        {valores.map((d, i) => {
          const cx = L + passo * i + passo / 2;
          const metaTop = y(d.metaValor);
          const realizadoTop = y(d.realizadoValor);
          const atingiu = d.realizadoValor >= d.metaValor;
          return (
            <g key={d.metrica}>
              <rect x={cx - bw / 2} y={metaTop} width={bw} height={Math.max(PLOT_BOTTOM - metaTop, 0)} className="fill-border-2" rx={2} />
              <rect
                x={cx - realizadoWidth / 2}
                y={realizadoTop}
                width={realizadoWidth}
                height={Math.max(PLOT_BOTTOM - realizadoTop, 0)}
                className={atingiu ? "fill-status-good" : "fill-status-bad"}
                rx={2}
              >
                <title>
                  {d.nomeExibicao}: {formatarNumero(d.realizado)} de {formatarNumero(d.meta)}
                  {modo === "percentual" ? ` (${Math.round(d.realizadoValor)}%)` : ""}
                </title>
              </rect>
              <text
                x={cx}
                y={PLOT_BOTTOM + 16}
                textAnchor="end"
                transform={`rotate(-38 ${cx} ${PLOT_BOTTOM + 16})`}
                className="fill-fg/70 text-[11px]"
              >
                {d.nomeExibicao}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
