import { useId, useState } from "react";
import { formatarNumero } from "../lib/formato";
import { paraPeriodo } from "../lib/periodo";
import { calcularRitmo } from "../lib/ritmo";
import type { DiasUteis } from "../lib/tipos-api";

export interface OpcaoMetrica {
  id: string;
  rotulo: string;
}

interface Props {
  opcoes: OpcaoMetrica[];
  selecionada: string;
  aoSelecionar: (id: string) => void;
  /** Valor do time por dia, o mês corrente inteiro (o BFF pré-zera até o último dia). */
  serie: { dia: string; valor: number }[];
  /** Meta do mês da métrica selecionada; `null`/0 = sem meta (sem linha de meta nem de ritmo). */
  meta: number | null;
  /** `dias_uteis` da resposta do mês corrente. */
  diasUteis: DiasUteis;
}

const W = 900;
const H = 240;
const ALTURA_GRAFICO = 238;
const INTERVALOS_Y = 4;

/** Passo "redondo" (1, 2, 5 × 10ⁿ) do eixo Y — sempre inteiro, a métrica é contagem. */
function passoRedondo(bruto: number): number {
  const potencia = 10 ** Math.floor(Math.log10(Math.max(bruto, 1)));
  const n = bruto / potencia;
  const passo = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * potencia;
  return Math.max(passo, 1);
}

function ehDiaUtil(iso: string): boolean {
  const dia = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return dia !== 0 && dia !== 6;
}

/** "01" -> "1": rótulo de dia do mês, sem o zero à esquerda. */
function diaDoMes(iso: string): string {
  return String(Number(iso.slice(8, 10)));
}

/**
 * Deslocamento horizontal de um rótulo/balão ancorado num ponto: centrado,
 * menos nas pontas, onde sairia do card. Vai em `style.transform` e não nas
 * utilitárias de translação do Tailwind v4, que geram a propriedade CSS
 * `translate` (inexistente no Chromium 94 da TV).
 */
function deslocamentoX(pctX: number, margem: number): string {
  if (pctX <= margem) return "none";
  if (pctX >= 100 - margem) return "translateX(-100%)";
  return "translateX(-50%)";
}

function arredondar(valor: number): string {
  return formatarNumero(Math.round(valor));
}

/**
 * Acompanhamento do mês corrente para uma métrica: realizado acumulado
 * (sólido), ritmo da meta acumulado por dia útil (tracejado — a meta se
 * distribui igual pelos dias úteis seg–sex), linha da meta, marcador de hoje e
 * projeção até o fim do mês pela média por dia útil (pontilhado).
 *
 * O SVG estica sem manter proporção (`preserveAspectRatio="none"`), então
 * todo texto (eixos, rótulos de meta/hoje, balão) é HTML posicionado em %.
 */
export function GraficoAreaMeta({ opcoes, selecionada, aoSelecionar, serie, meta, diasUteis }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const idTitulo = useId();
  const idDesc = useId();

  const atual = opcoes.find((o) => o.id === selecionada) ?? opcoes[0];

  if (!atual || serie.length < 2) {
    return (
      <article className="glass-panel flex flex-col gap-3 rounded-[24px] p-5">
        <span className="text-[15px] font-semibold uppercase tracking-[0.13em] text-muted">Realizado acumulado</span>
        <p className="text-lg text-muted">Sem evolução diária lançada no mês corrente.</p>
      </article>
    );
  }

  const n = serie.length;
  // Dia local (São Paulo na TV), não UTC: `toISOString()` virava o dia às 21h.
  const hojeIso = paraPeriodo("dia", new Date());
  const desenhados = serie.filter((d) => d.dia <= hojeIso).length;
  const metaMes = meta ?? 0;
  const temMeta = metaMes > 0;

  const acumulado: number[] = [];
  const uteisAte: number[] = [];
  serie.forEach((d, i) => {
    acumulado.push((acumulado[i - 1] ?? 0) + d.valor);
    uteisAte.push((uteisAte[i - 1] ?? 0) + (ehDiaUtil(d.dia) ? 1 : 0));
  });
  const totalUteis = diasUteis.total > 0 ? diasUteis.total : uteisAte[n - 1];

  const ritmoMeta = temMeta ? uteisAte.map((u) => metaMes * Math.min(u / Math.max(totalUteis, 1), 1)) : [];

  const indiceHoje = desenhados - 1;
  const acumuladoHoje = desenhados > 0 ? acumulado[indiceHoje] : 0;
  const { mediaPorDiaUtil } = calcularRitmo(acumuladoHoje, meta, diasUteis);
  const projecao =
    desenhados > 0 && desenhados < n
      ? serie.slice(indiceHoje).map((_, k) => acumuladoHoje + mediaPorDiaUtil * (uteisAte[indiceHoje + k] - uteisAte[indiceHoje]))
      : [];
  const projecaoFinal = projecao.at(-1) ?? null;

  const maior = Math.max(metaMes, acumuladoHoje, projecaoFinal ?? 0, 1);
  const passoY = passoRedondo((maior * 1.08) / INTERVALOS_Y);
  const maxY = passoY * INTERVALOS_Y;
  const ticksY = Array.from({ length: INTERVALOS_Y + 1 }, (_, i) => maxY - i * passoY);

  const fracaoY = (v: number) => 1 - Math.min(Math.max(v, 0), maxY) / maxY;
  const fracaoX = (i: number) => i / (n - 1);
  const ponto = (i: number, v: number) => `${(fracaoX(i) * W).toFixed(1)},${(fracaoY(v) * H).toFixed(1)}`;

  const linhaRealizado = acumulado.slice(0, desenhados).map((v, i) => ponto(i, v));
  const area =
    desenhados >= 2 ? `M${linhaRealizado.join(" L")} L${(fracaoX(indiceHoje) * W).toFixed(1)},${H} L0,${H} Z` : null;
  const linhaRitmo = ritmoMeta.map((v, i) => ponto(i, v));
  const linhaProjecao = projecao.map((v, k) => ponto(indiceHoje + k, v));
  const hojePctX = desenhados > 0 ? fracaoX(indiceHoje) * 100 : null;
  const esperadoHoje = temMeta && desenhados > 0 ? ritmoMeta[indiceHoje] : null;

  const resumo = [
    `Realizado acumulado até hoje: ${arredondar(acumuladoHoje)}.`,
    temMeta ? `Meta do mês: ${arredondar(metaMes)}.` : "Sem meta definida no período.",
    esperadoHoje !== null ? `Esperado hoje pelo ritmo da meta: ${arredondar(esperadoHoje)}.` : "",
    projecaoFinal !== null ? `Projeção para o fim do mês, mantendo a média por dia útil: ${arredondar(projecaoFinal)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  /** Dia mais próximo do cursor, limitado aos dias que já aconteceram. */
  function aoMover(evento: React.MouseEvent<HTMLDivElement>) {
    if (desenhados === 0) return;
    const caixa = evento.currentTarget.getBoundingClientRect();
    if (caixa.width === 0) return;
    const indice = Math.round(((evento.clientX - caixa.left) / caixa.width) * (n - 1));
    setHover(Math.min(Math.max(indice, 0), indiceHoje));
  }

  const hoverPctX = hover === null ? 0 : fracaoX(hover) * 100;

  return (
    <article className="glass-panel flex min-w-0 flex-col gap-4 rounded-[24px] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[15px] font-semibold uppercase tracking-[0.13em] text-muted">Realizado acumulado</span>
        <label className="flex items-center gap-2 text-[15px] font-semibold text-muted">
          Métrica
          <select
            value={atual.id}
            onChange={(e) => aoSelecionar(e.target.value)}
            className="min-h-[44px] rounded-lg border border-line bg-surface px-2 text-[16px] text-fg"
          >
            {opcoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] font-semibold text-muted" aria-label="Legenda">
        <li className="flex items-center gap-2">
          <span className="inline-block w-5 border-t-[3px] border-brand" aria-hidden /> Realizado
        </li>
        {temMeta && (
          <li className="flex items-center gap-2">
            <span className="inline-block w-5 border-t-2 border-dashed border-muted" aria-hidden /> Ritmo da meta
          </li>
        )}
        {projecao.length > 0 && (
          <li className="flex items-center gap-2">
            <span className="inline-block w-5 border-t-2 border-dotted border-brand" aria-hidden /> Projeção
          </li>
        )}
        {temMeta && (
          <li className="flex items-center gap-2">
            <span className="inline-block w-5 border-t-2 border-fg" aria-hidden /> Meta
          </li>
        )}
      </ul>

      <div className="flex gap-2 pb-1.5">
        <div className="relative w-[36px] shrink-0" style={{ height: ALTURA_GRAFICO }} data-eixo="y" aria-hidden>
          {ticksY.map((v) => (
            <span
              key={v}
              className="absolute right-0 text-[13px] font-medium text-muted"
              style={{ top: `${fracaoY(v) * 100}%`, transform: "translateY(-50%)" }}
            >
              {formatarNumero(v)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: ALTURA_GRAFICO }} onMouseMove={aoMover} onMouseLeave={() => setHover(null)}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="h-full w-full overflow-visible"
              role="img"
              aria-labelledby={`${idTitulo} ${idDesc}`}
            >
              <title id={idTitulo}>{`${atual.rotulo}: realizado acumulado no mês`}</title>
              <desc id={idDesc}>{resumo}</desc>
              {ticksY.map((v) => (
                <line key={v} x1={0} x2={W} y1={fracaoY(v) * H} y2={fracaoY(v) * H} className="stroke-line" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              {area && <path d={area} className="fill-brand" fillOpacity={0.1} />}
              {temMeta && (
                <>
                  <line
                    x1={0}
                    x2={W}
                    y1={fracaoY(metaMes) * H}
                    y2={fracaoY(metaMes) * H}
                    className="stroke-fg"
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                    data-serie="meta"
                  />
                  <polyline
                    points={linhaRitmo.join(" ")}
                    fill="none"
                    className="stroke-muted"
                    strokeWidth={2}
                    strokeDasharray="6 5"
                    vectorEffect="non-scaling-stroke"
                    data-serie="ritmo"
                  />
                </>
              )}
              {hojePctX !== null && (
                <line
                  x1={(hojePctX / 100) * W}
                  x2={(hojePctX / 100) * W}
                  y1={0}
                  y2={H}
                  className="stroke-faint"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  vectorEffect="non-scaling-stroke"
                  data-serie="hoje"
                />
              )}
              {linhaProjecao.length > 0 && (
                <polyline
                  points={linhaProjecao.join(" ")}
                  fill="none"
                  className="stroke-brand"
                  strokeWidth={2.5}
                  strokeDasharray="1 5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  data-serie="projecao"
                />
              )}
              {linhaRealizado.length >= 2 && (
                <polyline
                  points={linhaRealizado.join(" ")}
                  fill="none"
                  className="stroke-brand"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  data-serie="realizado"
                />
              )}
              {hover !== null && (
                <line
                  x1={(hoverPctX / 100) * W}
                  x2={(hoverPctX / 100) * W}
                  y1={0}
                  y2={H}
                  className="stroke-muted"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {temMeta && (
              <span
                className="pointer-events-none absolute right-0 whitespace-nowrap rounded bg-surface px-1 text-[13px] font-bold text-fg"
                style={{ top: `${fracaoY(metaMes) * 100}%`, transform: "translateY(-115%)" }}
                aria-hidden
              >
                Meta {formatarNumero(metaMes)}
              </span>
            )}
            {hojePctX !== null && (
              <span
                className="pointer-events-none absolute bottom-0 whitespace-nowrap rounded bg-surface px-1 text-[13px] font-bold text-muted"
                style={{ left: `${hojePctX}%`, transform: deslocamentoX(hojePctX, 6) }}
                aria-hidden
              >
                Hoje
              </span>
            )}

            {hover !== null && (
              <>
                <span
                  className="pointer-events-none absolute h-[9px] w-[9px] rounded-full bg-brand"
                  style={{ left: `${hoverPctX}%`, top: `${fracaoY(acumulado[hover]) * 100}%`, transform: "translate(-50%, -50%)" }}
                />
                <div
                  role="tooltip"
                  className="pointer-events-none absolute top-0 flex flex-col gap-0.5 whitespace-nowrap rounded-lg border border-line bg-surface px-3 py-2"
                  style={{ left: `${hoverPctX}%`, transform: deslocamentoX(hoverPctX, 12) }}
                >
                  <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Dia {diaDoMes(serie[hover].dia)}</span>
                  <span className="font-display text-[22px] font-extrabold leading-none tracking-tight">{formatarNumero(acumulado[hover])}</span>
                  <span className="text-[13px] font-semibold text-muted">+{formatarNumero(serie[hover].valor)} no dia</span>
                </div>
              </>
            )}
          </div>
          {/* Cada rótulo fica na MESMA fração do ponto do dia — mirar no rótulo acerta o dia. */}
          <div className="relative h-[19px]" data-eixo="x" aria-hidden>
            {serie.map((d, i) => {
              const pctX = fracaoX(i) * 100;
              return (
                <span
                  key={d.dia}
                  className="absolute top-0 text-[clamp(9px,1.05vw,14px)] font-medium leading-none text-muted"
                  style={{ left: `${pctX}%`, transform: i === 0 ? "none" : i === n - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
                >
                  {diaDoMes(d.dia)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </article>
  );
}
