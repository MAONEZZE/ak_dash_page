import type { ReactNode } from "react";
import { COR_TEXTO, statusDoAtingimento } from "../lib/atingimento";
import { formatarNumero } from "../lib/formato";
import { umaCasa } from "../lib/funil";
import { StatusChip } from "./StatusChip";

/** Meia-lua de 180° (raio 80): o arco vai de 0 (esquerda) até a meta (direita). */
const ARCO = "M 20 100 A 80 80 0 0 1 180 100";
const ESPESSURA = 16;

/**
 * Meia folga entre faixas, em unidades de `pathLength` (arco = 100). A ponta
 * redonda avança ESPESSURA/2 além do traço; somando 1 de vão visível de cada
 * lado: (8 + 1) / (π·80/100) ≈ 3,6.
 */
const FOLGA = 3.6;

/** Faixas do arco nos mesmos terços do % de atingimento (vermelho, amarelo, verde). */
const FAIXAS = [
  { de: 0, ate: 33.3, cor: "stroke-bad" },
  { de: 33.3, ate: 66.7, cor: "stroke-warn-bar" },
  { de: 66.7, ate: 100, cor: "stroke-ok" },
];

/** Traço arredondado do arco entre `de` e `ate` (em % do arco). */
function Traco({
  de,
  ate,
  className,
  ...resto
}: {
  de: number;
  ate: number;
  className: string;
  [k: `data-${string}`]: unknown;
}) {
  const tamanho = Math.max(ate - de, 0);
  return (
    <path
      {...resto}
      d={ARCO}
      fill="none"
      strokeWidth={ESPESSURA}
      strokeLinecap="round"
      pathLength={100}
      strokeDasharray={`${Math.round(tamanho * 10) / 10} 100`}
      strokeDashoffset={-de}
      className={className}
    />
  );
}

/**
 * Velocímetro semi-donut de uma métrica contra a meta do período, em card
 * próprio, no estilo das barras de progresso do site: faixas arredondadas
 * (vermelho, amarelo, verde) em tom suave, preenchidas até o atingimento, e
 * ponteiro marcando o valor (para em 100% mesmo acima da meta; o % escrito
 * não tem teto). O fundo do card pisca suave na cor da faixa do ponteiro.
 */
export function Velocimetro({
  rotulo,
  valor,
  meta,
  fonte,
  tamanho = "normal",
  foto,
}: {
  rotulo: string;
  valor: number;
  meta: number | null;
  /** De onde vêm os números (ex.: título e data do evento), abaixo do rótulo. */
  fonte?: { titulo: string; data?: string };
  /** "compacto": do tamanho de um CardKpi (grade de 4 colunas), título no mesmo estilo do rótulo dele. */
  tamanho?: "normal" | "compacto";
  /** Só no compacto: mostrada no canto superior esquerdo no lugar do título (que segue como nome acessível do medidor). */
  foto?: ReactNode;
}) {
  const c = tamanho === "compacto";
  // Meta 0 = nada a fazer (ex.: capacidade do evento já atingida): conta como atingida.
  const temMeta = meta !== null && meta >= 0;
  const pct = !temMeta ? null : meta === 0 ? 100 : (valor / meta) * 100;
  const status = statusDoAtingimento(pct);
  const marcado = pct === null ? 0 : Math.min(Math.max(pct, 0), 100);
  const angulo =
    pct === null ? null : Math.round((-90 + (marcado / 100) * 180) * 10) / 10;

  return (
    <div
      data-alerta={status}
      className={`glass-panel card-velocimetro flex items-center justify-center rounded-[24px] ${c ? "min-h-[168px] px-3 pb-[15px] pt-[17px]" : "p-6"}`}
    >
      <div
        role="meter"
        aria-label={rotulo}
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={temMeta ? meta : undefined}
        className={`relative flex w-full flex-col items-center ${c ? "gap-1" : "max-w-[460px] gap-2"}`}
      >
        {c && foto ? (
          <span data-foto className="self-start">
            {foto}
          </span>
        ) : (
          <span
            data-titulo
            className={`font-bold uppercase tracking-[0.13em] text-muted ${c ? "self-start text-[17px] font-semibold leading-snug" : "text-[30px]"}`}
          >
            {rotulo}
          </span>
        )}
        {fonte && (
          <span
            data-fonte
            className="flex flex-col items-center text-center leading-tight"
          >
            <span className="text-[18px] font-semibold">{fonte.titulo}</span>
            {fonte.data && (
              <span className="text-[15px] font-semibold text-muted">
                {fonte.data}
              </span>
            )}
          </span>
        )}
        <svg
          // Compacto: viewBox recortado na borda do arco (x 12–188, y 12–110) pra ele
          // ocupar a largura do card; 259px = 288 × 180/200, o mesmo arco de 1,2× o anterior.
          viewBox={c ? "10 10 180 102" : "0 0 200 112"}
          className={`block w-full overflow-visible ${c ? "max-w-[259px]" : ""}`}
          aria-hidden
        >
          {FAIXAS.map((f, i) => {
            const de = f.de + (i > 0 ? FOLGA : 0);
            const ate = f.ate - (i < FAIXAS.length - 1 ? FOLGA : 0);
            return (
              <g key={f.cor}>
                <Traco
                  data-faixa
                  de={de}
                  ate={ate}
                  className={`${f.cor} opacity-25`}
                />
                {marcado > de && (
                  <Traco
                    data-faixa-cheia
                    de={de}
                    ate={Math.min(marcado, ate)}
                    className={f.cor}
                  />
                )}
              </g>
            );
          })}
          {angulo !== null && (
            <g
              data-ponteiro
              data-angulo={angulo}
              className="transition-transform duration-700 ease-out"
              style={{
                transform: `rotate(${angulo}deg)`,
                transformOrigin: "100px 100px",
              }}
            >
              <line
                x1={100}
                y1={100}
                x2={100}
                y2={36}
                strokeWidth={6}
                strokeLinecap="round"
                className="stroke-current"
              />
              <circle cx={100} cy={100} r={10} className="fill-current" />
              <circle cx={100} cy={100} r={4} className="fill-surface" />
            </g>
          )}
        </svg>
        <span
          className={`font-display font-extrabold leading-none ${c ? "text-[36px]" : "text-[56px]"}`}
        >
          {formatarNumero(valor)}
        </span>
        <span
          className={`font-semibold text-muted ${c ? "text-[13px]" : "text-[15px]"}`}
        >
          {temMeta ? `de ${formatarNumero(meta)}` : "Meta aberta"}
        </span>
        {pct !== null &&
          (c ? (
            // Compacto: só o %, no canto inferior direito, sem o chip de status.
            <span
              data-pct
              className={`self-end font-display text-[18px] font-extrabold leading-none ${COR_TEXTO[status]}`}
            >{`${umaCasa(pct)}%`}</span>
          ) : (
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <span
                className={`font-display text-[24px] font-extrabold leading-none ${COR_TEXTO[status]}`}
              >{`${umaCasa(pct)}%`}</span>
              <StatusChip status={status} />
            </div>
          ))}
      </div>
    </div>
  );
}
