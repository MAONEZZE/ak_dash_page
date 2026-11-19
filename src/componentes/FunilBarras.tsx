import type { ReactNode } from "react";
import { formatarTaxa, formatoFunil, indiceGargalo } from "../lib/funil";
import { formatarNumero } from "../lib/formato";

export interface EtapaFunil {
  rotulo: string;
  valor: number;
  passagem?: { taxa: number | null; texto: string };
}

/** Raio (px) dos cantos arredondados dos trapézios. */
const RAIO = 10;

/**
 * Trapézio centrado com cantos arredondados: topo e base em % da largura da
 * coluna do funil. O SVG estica (preserveAspectRatio="none") e o contorno de
 * espessura fixa com junção redonda arredonda os cantos sem deformar o raio.
 * O polígono fica recuado RAIO px e o contorno devolve o tamanho original.
 */
function TrapezioArredondado({ topo, base }: { topo: number; base: number }) {
  const a = (100 - topo) / 2;
  const b = (100 - base) / 2;
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute overflow-visible fill-brand stroke-brand"
      style={{
        inset: RAIO,
        width: `calc(100% - ${2 * RAIO}px)`,
        height: `calc(100% - ${2 * RAIO}px)`,
      }}
    >
      <polygon
        points={`${a},0 ${100 - a},0 ${100 - b},100 ${b},100`}
        strokeWidth={2 * RAIO}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Marca a etapa que tem nota no rodapé do card e abre a nota. */
const MARCA_NOTA = "*";

/**
 * Funil de forma fixa (trapézios encaixados, do mais largo ao mais estreito),
 * com rótulo e valor dentro de cada etapa e a passagem para a próxima entre os
 * dois blocos, centralizados no card. A nota (`lateral`) vai no rodapé do card,
 * ligada à sua etapa por um asterisco no rótulo. `aoLado` fica à direita, com a mesma largura e
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
  const gargalo = indiceGargalo(
    etapas.map((e) => (e.passagem ? e.passagem.taxa : null)),
  );

  const cardFunil = (
    <div className="glass-panel flex flex-col gap-4 rounded-[24px] p-5">
      <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <h2 className="font-display text-[22px] font-bold tracking-tight">
          {titulo}
        </h2>
        <div
          role="group"
          aria-label="Conversão total do funil"
          className="flex flex-col items-start sm:items-end"
        >
          <span className="text-[12px] font-semibold uppercase tracking-[0.13em] text-muted">
            Conversão total do funil
          </span>
          <span className="font-display text-[32px] font-extrabold leading-none">
            {formatarTaxa(conversaoTotal)}
          </span>
        </div>
      </header>
      {/* zoom: etapas 1,2× maiores (ajuste de 19/11/2026); páginas podem sobrescrever via `[&_ol]`. */}
      <ol
        aria-label={titulo}
        className="flex w-full min-w-0 flex-1 flex-col justify-center [zoom:1.2]"
      >
        {etapas.map((etapa, i) => {
          const [topo, base] = formato[i];
          const ehGargalo = gargalo === i;
          const temNota = lateral !== undefined && lateral.aoLadoDe === i;

          return (
            <li key={etapa.rotulo} className="flex flex-col">
              <div
                data-linha-etapa
                className="mx-auto w-full max-w-[60%] min-w-[220px]"
              >
                <div
                  data-segmento
                  data-largura-topo={topo}
                  data-largura-base={base}
                  className="relative flex min-h-[60px] flex-col items-center justify-center px-2 text-center text-surface"
                >
                  <TrapezioArredondado topo={topo} base={base} />
                  <span className="relative text-[11px] font-semibold uppercase tracking-[0.06em] opacity-85 sm:tracking-[0.13em]">
                    {etapa.rotulo}
                    {temNota && <span data-marca-nota>{MARCA_NOTA}</span>}
                  </span>
                  <span className="relative font-display text-[24px] font-extrabold leading-none">
                    {formatarNumero(etapa.valor)}
                  </span>
                </div>
              </div>

              {etapa.passagem && (
                <div data-entre-etapas className="py-1.5">
                  <div
                    data-passagem
                    data-gargalo={ehGargalo ? "true" : undefined}
                    className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[14px] font-semibold ${
                      ehGargalo ? "text-bad" : "text-muted"
                    }`}
                  >
                    <span>{`↓ ${formatarTaxa(etapa.passagem.taxa)} ${etapa.passagem.texto}`}</span>
                    {ehGargalo && (
                      <span className="rounded-full bg-bad-bg px-2 py-0.5 text-[11px] uppercase tracking-[0.08em]">
                        maior perda
                      </span>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {lateral && (
        <footer
          data-nota-rodape
          className="border-t border-line pt-3 text-[13px] font-semibold text-muted"
        >
          {MARCA_NOTA} {lateral.rotulo}:{" "}
          <span className="text-fg">{lateral.texto}</span>
        </footer>
      )}
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
