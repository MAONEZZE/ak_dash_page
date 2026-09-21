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
/** Largura reservada pra coluna de rótulos do eixo Y, fora do SVG. */
const LARGURA_EIXO_Y = 68;

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const STROKE: Record<SerieFinanceiro["cor"], string> = {
  accent: "stroke-accent",
  "status-bad": "stroke-status-bad",
};
const FILL: Record<SerieFinanceiro["cor"], string> = {
  accent: "fill-accent",
  "status-bad": "fill-status-bad",
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
  const grade = Array.from({ length: nLinhasGrade + 1 }, (_, i) => ({
    y: y((teto / nLinhasGrade) * i),
    valor: (teto / nLinhasGrade) * i,
  }));
  const colunasX = Array.from({ length: nPontos }, (_, i) => x(i));

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

      <div className="flex gap-1">
        {/*
         * Rótulos do eixo Y ficam FORA do SVG, em HTML normal — dentro dele,
         * com `preserveAspectRatio="none"` (a largura estica e a altura é
         * fixa), texto ficaria distorcido, esticado ou espremido de forma
         * diferente em cada largura de tela. Posição em `%` de PT/(H-PB):
         * escala vertical é uniforme mesmo com "none", só a horizontal muda.
         */}
        <div className="relative shrink-0" style={{ width: LARGURA_EIXO_Y, height: 150 }}>
          {[...grade].reverse().map((linha, i) => (
            <span
              key={i}
              className="absolute right-1 -translate-y-1/2 whitespace-nowrap text-[13px] font-medium text-fg/50"
              style={{ top: `${(linha.y / H) * 100}%` }}
            >
              {formatarNumero(linha.valor)}
            </span>
          ))}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[150px] min-w-0 flex-1 overflow-visible">
          {/* Grade pontilhada e discreta nos cruzamentos entre X e Y — --border-2 já é o token translúcido de baixo contraste usado nas outras grades da casa. */}
          {grade.map((linha, i) => (
            <line
              key={`h${i}`}
              x1={PL}
              x2={W - PR}
              y1={linha.y}
              y2={linha.y}
              className="stroke-border-2"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          ))}
          {colunasX.map((xx, i) => (
            <line
              key={`v${i}`}
              x1={xx}
              x2={xx}
              y1={PT}
              y2={H - PB}
              className="stroke-border-2"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          ))}

          {series.map((serie) => (
            <g key={serie.rotulo}>
              <polyline
                points={serie.valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
                fill="none"
                className={STROKE[serie.cor]}
                strokeWidth={2.5}
                strokeDasharray={serie.tracejada ? "7 5" : undefined}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {serie.valores.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={4} className={FILL[serie.cor]} />
              ))}
            </g>
          ))}
        </svg>
      </div>

      <div className="flex justify-between pb-1 pr-1" style={{ paddingLeft: LARGURA_EIXO_Y + 4 }}>
        {mostrarEixoX &&
          MESES.map((m, i) => (
            <span key={i} className="text-[13px] font-medium text-fg/50">
              {m}
            </span>
          ))}
      </div>
    </div>
  );
}
