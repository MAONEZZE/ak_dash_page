import { useState } from "react";
import { formatarNumero } from "../lib/formato";
import { escalaMetades, serieGraficoContas } from "../lib/funil";
import type { ContaFunil, MetricaConta, Periodo } from "../lib/tipos-api";

const W = 1000;
const H = 300;
const ALTURA_PLOT_PX = 300;
const LARGURA_EIXO_Y = 56;
const DIAMETRO_PONTO = 8;
/** Acima disso os rótulos do eixo X são intercalados pra não se sobreporem. */
const MAX_ROTULOS_X = 16;

/*
 * Uma cor por conta, na ordem da lista. Classes literais pro Tailwind gerar.
 * Deslocamentos em `transform` inline: as utilities `translate-*` do Tailwind
 * v4 geram a propriedade `translate`, que o Chromium 94 da TV não conhece.
 */
const CORES = [
  { traco: "stroke-brand", ponto: "bg-brand" },
  { traco: "stroke-closer", ponto: "bg-closer" },
  { traco: "stroke-fogo", ponto: "bg-fogo" },
  { traco: "stroke-gelo", ponto: "bg-gelo" },
  { traco: "stroke-atencao", ponto: "bg-atencao" },
  { traco: "stroke-perigo", ponto: "bg-perigo" },
];

/**
 * Linhas por conta da métrica escolhida no dropdown, ao longo do período do
 * filtro (um ponto por dia, ou por mês no ano). Eixo Y em 0, metade e total.
 */
export function GraficoContasFunil({
  contas,
  periodo,
  metricas,
  hoje = new Date(),
}: {
  contas: ContaFunil[];
  periodo: Periodo;
  metricas: { chave: MetricaConta; rotulo: string }[];
  hoje?: Date;
}) {
  const [metrica, setMetrica] = useState<MetricaConta>(metricas[0].chave);
  const { rotulos, series } = serieGraficoContas(contas, metrica, periodo, hoje);
  const marcas = escalaMetades(series.flatMap((s) => s.valores));
  const teto = marcas[2];
  const n = rotulos.length;

  // Com um ponto só (filtro de dia) ele fica no meio.
  const pctX = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const pctY = (v: number) => (1 - v / teto) * 100;
  const passoRotulo = Math.ceil(n / MAX_ROTULOS_X);
  // Índices com rótulo no eixo X; no celular (< sm) só uns 5 deles, pra não encavalar.
  const comRotulo = rotulos.map((_, j) => j).filter((j) => j % passoRotulo === 0 || j === n - 1);
  const passoCelular = Math.ceil(comRotulo.length / 5);
  const noCelular = new Set(comRotulo.filter((_, k) => k % passoCelular === 0 && comRotulo.length - 1 - k >= passoCelular / 2));
  noCelular.add(n - 1);

  return (
    <section className="glass-panel flex flex-col gap-4 rounded-[24px] p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[24px] font-bold tracking-tight">Evolução por conta</h2>
        <label className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.13em] text-muted">
          Métrica
          <select
            value={metrica}
            onChange={(e) => setMetrica(e.target.value as MetricaConta)}
            className="glass-pill min-h-11 cursor-pointer px-4 text-[15px] font-semibold normal-case tracking-normal text-fg"
          >
            {metricas.map((m) => (
              <option key={m.chave} value={m.chave}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </label>
      </header>

      <ul aria-label="Contas" className="flex flex-wrap gap-x-5 gap-y-2">
        {series.map((s, i) => (
          <li key={s.nome} className="flex items-center gap-2 text-[15px] font-semibold text-muted">
            <span className={`inline-block h-[3px] w-5 rounded-full ${CORES[i % CORES.length].ponto}`} aria-hidden />
            {s.nome}
          </li>
        ))}
      </ul>

      <figure aria-label="Evolução por conta" className="m-0 flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative shrink-0" style={{ width: LARGURA_EIXO_Y, height: ALTURA_PLOT_PX }}>
            {[...marcas].reverse().map((valor) => (
              <span
                key={valor}
                data-rotulo-y
                className="absolute right-0 text-[13px] font-semibold text-muted"
                style={{ top: `${pctY(valor)}%`, transform: "translateY(-50%)" }}
              >
                {formatarNumero(valor)}
              </span>
            ))}
          </div>

          <div className="relative min-w-0 flex-1" style={{ height: ALTURA_PLOT_PX }}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
              {marcas.map((valor) => (
                <line
                  key={valor}
                  x1={0}
                  x2={W}
                  y1={(pctY(valor) / 100) * H}
                  y2={(pctY(valor) / 100) * H}
                  className="stroke-line"
                  strokeDasharray={valor === 0 ? undefined : "4 6"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {series.map((s, i) => (
                <polyline
                  key={s.nome}
                  data-linha
                  points={s.valores.map((v, j) => `${(pctX(j) / 100) * W},${(pctY(v) / 100) * H}`).join(" ")}
                  fill="none"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className={CORES[i % CORES.length].traco}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {/* Pontos em HTML: em SVG com `preserveAspectRatio="none"` o círculo viraria elipse. */}
            {n <= 31 &&
              series.map((s, i) =>
                s.valores.map((v, j) => (
                  <span
                    key={`${s.nome}-${j}`}
                    className={`absolute rounded-full ${CORES[i % CORES.length].ponto}`}
                    style={{
                      width: DIAMETRO_PONTO,
                      height: DIAMETRO_PONTO,
                      left: `${pctX(j)}%`,
                      top: `${pctY(v)}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    title={`${s.nome} · ${rotulos[j]}: ${formatarNumero(v)}`}
                  />
                )),
              )}
          </div>
        </div>

        <div className="relative h-5" style={{ marginLeft: LARGURA_EIXO_Y + 8 }}>
          {rotulos.map((rotulo, j) =>
            comRotulo.includes(j) ? (
              <span
                key={rotulo}
                data-rotulo-x
                className={`absolute whitespace-nowrap text-[13px] font-semibold text-muted ${noCelular.has(j) ? "" : "max-sm:hidden"}`}
                style={{ left: `${pctX(j)}%`, transform: n <= 1 ? "translateX(-50%)" : j === 0 ? "none" : j === n - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
              >
                {rotulo}
              </span>
            ) : null,
          )}
        </div>
      </figure>
    </section>
  );
}
