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

/** Largura de um caractere do rótulo (maiúsculo, peso 600, com tracking), em em: medido 0,72–0,78 no navegador. */
const EM_POR_CARACTERE = 0.8;
/** Padding horizontal do segmento (px-2): `cqi` mede a caixa de conteúdo, sem ele. */
const PADDING_SEGMENTO = 8;

/**
 * Rótulo no canto: a caixa vai de uma borda inclinada à outra na altura da
 * base do trapézio (largura visível = base% do SVG + o contorno, menos RAIO
 * de folga de cada lado). A fonte encolhe para caber numa linha (11px → 9px);
 * abaixo de 9px o texto quebra, alinhado à direita.
 */
function estiloRotuloNoCanto(base: number, texto: string) {
  const lado = (100 - base) / 2; // % da largura do segmento fora do trapézio, de cada lado, na base
  const fixo = (lado * (2 * PADDING_SEGMENTO - 2 * RAIO)) / 100 + RAIO;
  const recuo = `calc(${lado}cqi + ${+fixo.toFixed(2)}px)`;
  const largura = `(${base}cqi + ${+(2 * PADDING_SEGMENTO - 2 * fixo).toFixed(2)}px)`;
  const ems = +(texto.length * EM_POR_CARACTERE).toFixed(1);
  return {
    right: recuo,
    left: recuo,
    fontSize: `clamp(9px, calc(${largura} / ${ems}), 11px)`,
  };
}

/**
 * Funil de forma fixa (trapézios encaixados, do mais largo ao mais estreito),
 * com rótulo e valor dentro de cada etapa e a passagem para a próxima entre os
 * dois blocos, centralizados no card. A nota (`lateral`) vai no rodapé (padrão) ou, com `formato: "card"`, num card à esquerda da etapa ligado por linha pontilhada.
 * No rodapé, a etapa dela ganha um asterisco no rótulo. `aoLado` fica à direita, com a mesma largura e
 * altura do card do funil (o conteúdo traz o próprio card, ex.: Velocimetro).
 */
export function FunilBarras({
  titulo,
  etapas,
  lateral,
  conversaoTotal,
  aoLado,
  rotuloNoCanto = false,
}: {
  titulo: string;
  etapas: EtapaFunil[];
  lateral?: { rotulo: string; texto: string; aoLadoDe: number; formato?: "rodape" | "card" };
  conversaoTotal: number | null;
  aoLado?: ReactNode;
  /** Rótulo da etapa no canto inferior direito do trapézio e número maior, sozinho no centro (página Funil SDR). */
  rotuloNoCanto?: boolean;
}) {
  const formato = formatoFunil(etapas.length);
  const gargalo = indiceGargalo(
    etapas.map((e) => (e.passagem ? e.passagem.taxa : null)),
  );
  const comoCard = lateral?.formato === "card";

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
          const temNota = !comoCard && lateral !== undefined && lateral.aoLadoDe === i;
          const notaCard = comoCard && lateral?.aoLadoDe === i;
          const bordaEsquerda = 50 - (topo + base) / 4;

          return (
            <li key={etapa.rotulo} className="flex flex-col">
              <div
                data-linha-etapa
                className={`mx-auto w-full max-w-[60%] min-w-[220px]${notaCard ? " relative" : ""}`}
              >
                <div
                  data-segmento
                  data-largura-topo={topo}
                  data-largura-base={base}
                  className={`relative flex flex-col items-center justify-center px-2 text-center text-surface ${rotuloNoCanto ? "min-h-[80px] pb-4 [container-type:inline-size]" : "min-h-[60px]"}`}
                >
                  <TrapezioArredondado topo={topo} base={base} />
                  <span
                    data-rotulo-etapa
                    className={`text-[11px] font-semibold uppercase tracking-[0.06em] opacity-85 sm:tracking-[0.13em] ${rotuloNoCanto ? "absolute bottom-2 order-2 text-right leading-tight" : "relative"}`}
                    style={
                      rotuloNoCanto
                        ? estiloRotuloNoCanto(base, etapa.rotulo + (temNota ? MARCA_NOTA : ""))
                        : undefined
                    }
                  >
                    {etapa.rotulo}
                    {temNota && <span data-marca-nota>{MARCA_NOTA}</span>}
                  </span>
                  <span
                    className={`relative font-display font-extrabold leading-none ${rotuloNoCanto ? "text-[40px]" : "text-[24px]"}`}
                  >
                    {formatarNumero(etapa.valor)}
                  </span>
                </div>
                {notaCard && lateral && (
                  <>
                    <span
                      data-conector
                      aria-hidden
                      className="absolute top-1/2 hidden border-t-2 border-dashed border-border-forte sm:block"
                      style={{ left: -12, right: `${100 - bordaEsquerda}%` }}
                    />
                    <div data-nota-lateral className="mt-2 flex flex-col items-center rounded-[12px] bg-surface-2 px-3 py-1.5 text-center sm:absolute sm:right-[calc(100%+12px)] sm:top-1/2 sm:mt-0 sm:w-max sm:max-w-[200px] sm:-translate-y-1/2 sm:items-end sm:text-right">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">{lateral.rotulo}</span>
                      <span className="font-display text-[16px] font-extrabold">{lateral.texto}</span>
                    </div>
                  </>
                )}
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
      {lateral && !comoCard && (
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
