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
/** Altura renderizada do plot (era 150px, depois 195px — mais um aumento a pedido). Centralizada aqui porque tem que bater com o `height` inline da coluna de rótulos do eixo Y logo abaixo (classe Tailwind arbitrária não aceita valor calculado em runtime). */
const ALTURA_PLOT_PX = 260;
/** Diâmetro fixo (px) dos pontos — em HTML, não em SVG (ver comentário abaixo). */
const DIAMETRO_PONTO = 9;

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
        <div className="relative shrink-0" style={{ width: LARGURA_EIXO_Y, height: ALTURA_PLOT_PX }}>
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

        <div className="relative min-w-0 flex-1" style={{ height: ALTURA_PLOT_PX }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
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

          {/*
           * Os pontos são HTML, não `<circle>` do SVG: com `preserveAspectRatio="none"`
           * a escala horizontal e a vertical do SVG são diferentes, então um `<circle>`
           * de raio fixo em unidades do viewBox sai como elipse achatada. Em `%` de
           * posição (que continua correto sob "none" — só a escala muda, não a
           * proporção da posição) + tamanho fixo em px fora do SVG, o ponto fica
           * sempre redondo de verdade.
           */}
          {series.map((serie) =>
            serie.valores.map((v, i) => (
              <span
                key={`${serie.rotulo}-${i}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${SWATCH[serie.cor]}`}
                style={{
                  left: `${(x(i) / W) * 100}%`,
                  top: `${(y(v) / H) * 100}%`,
                  width: DIAMETRO_PONTO,
                  height: DIAMETRO_PONTO,
                }}
              />
            )),
          )}
        </div>
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
