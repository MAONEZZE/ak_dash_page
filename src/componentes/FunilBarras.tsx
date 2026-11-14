import type { ReactNode } from "react";
import { formatarTaxa, formatoFunil, indiceGargalo } from "../lib/funil";
import { formatarNumero } from "../lib/formato";

export interface EtapaFunil {
  rotulo: string;
  valor: number;
  passagem?: { taxa: number | null; texto: string };
}

/** Trapézio centrado: topo e base em % da largura da coluna do funil. */
function recorte(topo: number, base: number): string {
  const a = (100 - topo) / 2;
  const b = (100 - base) / 2;
  return `polygon(${a}% 0, ${100 - a}% 0, ${100 - b}% 100%, ${b}% 100%)`;
}

/** Grade de cada linha: blocos à esquerda, coluna da nota lateral à direita. */
const GRADE_LINHA = "grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-center";

/**
 * Funil de forma fixa (trapézios encaixados, do mais largo ao mais estreito),
 * com rótulo e valor dentro de cada etapa e a passagem para a próxima entre os
 * dois blocos. A nota lateral fica ao lado da sua etapa, ligada por uma linha
 * que sai da borda do trapézio. `aoLado` fica à direita, com a mesma largura e
 * altura do card do funil (o conteúdo traz o próprio card, ex.: Velocimetro).
 */
export function FunilBarras({
  titulo,
  etapas,
  lateral,
  conversaoTotal,
  aoLado,
}: {
  titulo: string;
  etapas: EtapaFunil[];
  lateral?: { rotulo: string; texto: string; aoLadoDe: number };
  conversaoTotal: number | null;
  aoLado?: ReactNode;
}) {
  const formato = formatoFunil(etapas.length);
  const gargalo = indiceGargalo(etapas.map((e) => (e.passagem ? e.passagem.taxa : null)));

  const cardFunil = (
    <div className="glass-panel flex flex-col gap-4 rounded-[24px] p-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-[22px] font-bold tracking-tight">{titulo}</h2>
        <div role="group" aria-label="Conversão total do funil" className="flex flex-col items-end">
          <span className="text-[12px] font-semibold uppercase tracking-[0.13em] text-muted">Conversão total do funil</span>
          <span className="font-display text-[32px] font-extrabold leading-none">{formatarTaxa(conversaoTotal)}</span>
        </div>
      </header>
      <ol aria-label={titulo} className="flex w-full min-w-0 flex-col">
          {etapas.map((etapa, i) => {
            const [topo, base] = formato[i];
            const ehGargalo = gargalo === i;
            const temLateral = lateral !== undefined && lateral.aoLadoDe === i;
            // Borda direita do trapézio na altura do meio, em % da coluna dos blocos.
            const bordaDireita = 50 + (topo + base) / 4;

            return (
              <li key={etapa.rotulo} className="flex flex-col">
                <div data-linha-etapa className={GRADE_LINHA}>
                  <div className="relative col-start-1">
                    <div
                      data-segmento
                      data-largura-topo={topo}
                      data-largura-base={base}
                      className="flex min-h-[60px] flex-col items-center justify-center bg-brand px-2 text-center text-surface"
                      style={{ clipPath: recorte(topo, base) }}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.13em] opacity-85">{etapa.rotulo}</span>
                      <span className="font-display text-[24px] font-extrabold leading-none">{formatarNumero(etapa.valor)}</span>
                    </div>
                    {temLateral && (
                      <span
                        data-conector
                        aria-hidden
                        className="absolute top-1/2 border-t-2 border-dashed border-border-forte"
                        style={{ left: `${bordaDireita}%`, right: -24 }}
                      />
                    )}
                  </div>
                  {temLateral && (
                    <div data-nota-lateral className="col-start-2 ml-6 flex min-w-0 flex-col rounded-[12px] bg-surface-2 px-3 py-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">{lateral.rotulo}</span>
                      <span className="font-display text-[16px] font-extrabold">{lateral.texto}</span>
                    </div>
                  )}
                </div>

                {etapa.passagem && (
                  <div data-entre-etapas className={`${GRADE_LINHA} py-1.5`}>
                    <div
                      data-passagem
                      data-gargalo={ehGargalo ? "true" : undefined}
                      className={`col-start-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[14px] font-semibold ${
                        ehGargalo ? "text-bad" : "text-muted"
                      }`}
                    >
                      <span>{`↓ ${formatarTaxa(etapa.passagem.taxa)} ${etapa.passagem.texto}`}</span>
                      {ehGargalo && <span className="rounded-full bg-bad-bg px-2 py-0.5 text-[11px] uppercase tracking-[0.08em]">maior perda</span>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
      </ol>
    </div>
  );

  if (!aoLado) return cardFunil;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {cardFunil}
      <div data-ao-lado className="grid">
        {aoLado}
      </div>
    </div>
  );
}
