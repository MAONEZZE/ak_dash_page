import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import type { Consolidado } from "../lib/insights";
import { ORDEM_STATUS } from "../lib/insights";
import type { StatusMetrica } from "../lib/tipos-api";

const ESTILO_STATUS: Record<
  StatusMetrica,
  { rotulo: string; icone: typeof CheckCircle2; corClasse: string; corStroke: string; hachurada?: boolean }
> = {
  atingido: { rotulo: "Atingido", icone: CheckCircle2, corClasse: "text-status-good", corStroke: "stroke-status-good" },
  abaixo_da_meta: { rotulo: "Abaixo da meta", icone: XCircle, corClasse: "text-status-bad", corStroke: "stroke-status-bad" },
  sem_preenchimento: {
    rotulo: "Sem preenchimento",
    icone: MinusCircle,
    corClasse: "text-status-neutro",
    corStroke: "stroke-status-neutro",
    hachurada: true,
  },
};

interface Props {
  consolidado: Consolidado;
}

// Geometria fixa do mockup: viewBox 190×190, centro (95,95), raio externo 78, interno 46.
const CX = 95;
const CY = 95;
const RAIO_EXTERNO = 78;
const RAIO_INTERNO = 46;
const RAIO_ANEL = (RAIO_EXTERNO + RAIO_INTERNO) / 2;
const LARGURA_ANEL = RAIO_EXTERNO - RAIO_INTERNO;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO_ANEL;

export function GraficoStatusPizza({ consolidado }: Props) {
  const { contagemStatus } = consolidado;
  const total = contagemStatus.atingido + contagemStatus.abaixo_da_meta + contagemStatus.sem_preenchimento;
  const fatias = ORDEM_STATUS.map((status) => ({ status, valor: contagemStatus[status] })).filter((f) => f.valor > 0);

  if (total === 0) {
    return <p className="text-sm text-fg/60">Sem métricas no período pra distribuir.</p>;
  }

  const resumoTextual = fatias
    .map((f) => `${ESTILO_STATUS[f.status].rotulo}: ${f.valor} de ${total} (${Math.round((f.valor / total) * 100)}%)`)
    .join("; ");

  const fatiasComOffset: { status: StatusMetrica; valor: number; comprimento: number; offset: number }[] = [];
  for (const fatia of fatias) {
    const comprimento = (fatia.valor / total) * CIRCUNFERENCIA;
    const acumuladoAntes = fatiasComOffset.reduce((soma, f) => soma + f.comprimento, 0);
    fatiasComOffset.push({ ...fatia, comprimento, offset: -acumuladoAntes });
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <svg
        viewBox="0 0 190 190"
        className="h-40 w-40 shrink-0"
        role="img"
        aria-label={`Distribuição de status das métricas: ${resumoTextual}`}
      >
        <defs>
          <pattern id="hachura-status" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" className="fill-hachura-b" />
            <rect width="4" height="8" className="fill-hachura-a" />
          </pattern>
        </defs>

        <circle
          cx={CX}
          cy={CY}
          r={RAIO_ANEL}
          fill="none"
          className="stroke-bg-2"
          strokeWidth={LARGURA_ANEL + 2}
        />

        {fatiasComOffset.map((fatia) => {
          const { comprimento, offset } = fatia;
          const { corStroke, hachurada, rotulo } = ESTILO_STATUS[fatia.status];
          return (
            <circle
              key={fatia.status}
              cx={CX}
              cy={CY}
              r={RAIO_ANEL}
              fill="none"
              stroke={hachurada ? "url(#hachura-status)" : undefined}
              className={hachurada ? undefined : corStroke}
              strokeWidth={LARGURA_ANEL}
              strokeDasharray={`${comprimento} ${CIRCUNFERENCIA - comprimento}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${CX} ${CY})`}
            >
              <title>
                {rotulo}: {fatia.valor} de {total} ({Math.round((fatia.valor / total) * 100)}%)
              </title>
            </circle>
          );
        })}

        <text x={CX} y={CY - 4} textAnchor="middle" className="fill-fg text-[22px] font-semibold tabular-nums">
          {consolidado.coberturaLancto === null ? "—" : `${Math.round(consolidado.coberturaLancto * 100)}%`}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" className="fill-fg/60 text-[10px]">
          cobertura
        </text>
      </svg>

      <ul className="flex flex-col gap-1.5 text-sm">
        {ORDEM_STATUS.map((status) => {
          const { rotulo, icone: Icone, corClasse } = ESTILO_STATUS[status];
          const valor = contagemStatus[status];
          return (
            <li key={status} className="flex items-center gap-2">
              <Icone className={`size-4 shrink-0 ${corClasse}`} aria-hidden />
              <span className="tabular-nums font-medium">{valor}</span>
              <span className="text-fg/70">{rotulo}</span>
              <span className="tabular-nums text-fg/50">{total > 0 ? `${Math.round((valor / total) * 100)}%` : "—"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
