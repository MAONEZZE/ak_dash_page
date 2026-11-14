import { formatarTaxa, indiceGargalo, largurasEtapas } from "../lib/funil";
import { formatarNumero } from "../lib/formato";

export interface EtapaFunil {
  rotulo: string;
  valor: number;
  passagem?: { taxa: number | null; texto: string; textoPerda: string };
}

/** Funil em barras horizontais, com largura proporcional ao maior valor de cada etapa. */
export function FunilBarras({
  titulo,
  etapas,
  lateral,
}: {
  titulo: string;
  etapas: EtapaFunil[];
  lateral?: { rotulo: string; texto: string; aoLadoDe: number };
}) {
  const larguras = largurasEtapas(etapas.map((e) => e.valor));
  const gargalo = indiceGargalo(etapas.map((e) => (e.passagem ? e.passagem.taxa : null)));
  return (
    <div className="glass-panel flex flex-col gap-4 rounded-[24px] p-5">
      <ol aria-label={titulo} className="flex flex-col gap-2">
        {etapas.map((etapa, i) => {
          const proxima = etapas[i + 1];
          const perda = proxima ? etapa.valor - proxima.valor : 0;
          const ehGargalo = gargalo === i;
          return (
            <li key={etapa.rotulo} className="flex flex-col gap-2">
              <span className="text-center text-[13px] font-semibold uppercase tracking-[0.13em] text-muted">{etapa.rotulo}</span>
              <div className="flex items-center gap-3">
                <span className="w-24" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 justify-center">
                  <div data-barra className="h-10 rounded-[12px] bg-brand" style={{ width: `${larguras[i]}%` }} />
                </div>
                <span className="w-24 text-right font-display text-[28px] font-extrabold leading-none">{formatarNumero(etapa.valor)}</span>
              </div>
              {lateral && lateral.aoLadoDe === i && (
                <div className="self-center rounded-[12px] bg-surface-2 px-3 py-2 text-center">
                  <span className="block text-[12px] font-semibold uppercase tracking-[0.13em] text-muted">{lateral.rotulo}</span>
                  <span className="block font-display text-[18px] font-extrabold">{lateral.texto}</span>
                </div>
              )}
              {etapa.passagem && (
                <div
                  data-passagem
                  data-gargalo={ehGargalo ? "true" : undefined}
                  className={`flex flex-wrap items-center justify-center gap-2 text-[14px] font-semibold ${ehGargalo ? "text-bad" : "text-muted"}`}
                >
                  <span>{`↓ ${formatarTaxa(etapa.passagem.taxa)} ${etapa.passagem.texto}`}</span>
                  {perda > 0 && <span>{`−${formatarNumero(perda)} ${etapa.passagem.textoPerda}`}</span>}
                  {ehGargalo && <span className="rounded-full bg-bad-bg px-2 py-0.5 text-[12px] uppercase tracking-[0.08em]">maior perda</span>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
