import { tetoElastico } from "../lib/agregacoes-financeiro";
import { formatarNumero } from "../lib/formato";

export interface SerieFinanceiro {
  rotulo: string;
  valores: number[]; // 12 pontos, jan..dez
  cor: "accent" | "status-bad";
  tracejada?: boolean;
}

interface Props {
  titulo: string;
  series: SerieFinanceiro[];
  /** Teto-piso do eixo Y (ex. 1_000_000 no gráfico de vendido, 300_000 no de pago×líquido). */
  piso: number;
  /** Passo do teto elástico quando algum valor ultrapassa o piso (ex. 250_000 / 100_000). */
  multiploTeto: number;
  /** Rótulos de mês (Jan..Dez) só aparecem uma vez — os dois gráficos empilhados compartilham o eixo X. */
  mostrarEixoX?: boolean;
}

const W = 900;
const H = 170;
const PL = 8;
const PR = 8;
const PT = 10;
const PB = 8;

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const STROKE: Record<SerieFinanceiro["cor"], string> = {
  accent: "stroke-accent",
  "status-bad": "stroke-status-bad",
};
const SWATCH: Record<SerieFinanceiro["cor"], string> = {
  accent: "bg-accent",
  "status-bad": "bg-status-bad",
};

export function GraficoLinhasFinanceiro({ titulo, series, piso, multiploTeto, mostrarEixoX = false }: Props) {
  const teto = tetoElastico(
    series.flatMap((s) => s.valores),
    piso,
    multiploTeto,
  );
  const nPontos = 12;
  const x = (i: number) => PL + (i / (nPontos - 1)) * (W - PL - PR);
  const y = (v: number) => PT + (1 - v / teto) * (H - PT - PB);
  const nLinhasGrade = 4;
  const grade = Array.from({ length: nLinhasGrade + 1 }, (_, i) => y((teto / nLinhasGrade) * i));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-lg font-semibold text-fg/70">{titulo}</span>
        <div className="flex items-center gap-3">
          {series.map((s) => (
            <span key={s.rotulo} className="flex items-center gap-1.5 text-[15px] text-fg/60">
              <span className={`inline-block h-[3px] w-4 ${SWATCH[s.cor]}`} />
              {s.rotulo}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[150px] w-full overflow-visible">
        {grade.map((yy, i) => (
          <line key={i} x1={PL} x2={W - PR} y1={yy} y2={yy} className="stroke-border-2" strokeWidth={1} />
        ))}
        {series.map((serie) => (
          <polyline
            key={serie.rotulo}
            points={serie.valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
            fill="none"
            className={STROKE[serie.cor]}
            strokeWidth={2.5}
            strokeDasharray={serie.tracejada ? "7 5" : undefined}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="flex justify-between px-1">
        {mostrarEixoX && MESES.map((m, i) => (
          <span key={i} className="text-[13px] font-medium text-fg/50">
            {m}
          </span>
        ))}
      </div>

      <span className="sr-only">{`teto do eixo: ${formatarNumero(teto)}`}</span>
    </div>
  );
}
