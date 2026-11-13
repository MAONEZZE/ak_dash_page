import { formatarTaxa } from "../lib/funil";
import { formatarNumero } from "../lib/formato";

export interface EtapaFunil {
  rotulo: string;
  valor: number;
  passagem?: { taxa: number | null; texto: string };
}

/** Funil em escada, como na planilha: cada etapa recua um pouco mais que a anterior. */
export function FunilEscada({
  titulo,
  etapas,
  lateral,
}: {
  titulo: string;
  etapas: EtapaFunil[];
  lateral?: { rotulo: string; texto: string; aoLadoDe: number };
}) {
  return (
    <ol aria-label={titulo} className="flex flex-col gap-3">
      {etapas.map((etapa, i) => (
        <li key={etapa.rotulo} className="flex items-center gap-3" style={{ marginLeft: `${i * 8}%` }}>
          {lateral && lateral.aoLadoDe === i && (
            <div className="glass-panel rounded-[24px] p-4">
              <span className="block text-[13px] font-semibold uppercase tracking-[0.13em] text-muted">{lateral.rotulo}</span>
              <span className="block font-display text-[24px] font-extrabold">{lateral.texto}</span>
            </div>
          )}
          <div className="glass-panel flex-1 rounded-[24px] p-5">
            <span className="block text-[15px] font-semibold uppercase tracking-[0.13em] text-muted">{etapa.rotulo}</span>
            <span className="block font-display text-[40px] font-extrabold">{formatarNumero(etapa.valor)}</span>
          </div>
          {etapa.passagem && (
            <span className="text-muted">{`↓ ${formatarTaxa(etapa.passagem.taxa)} ${etapa.passagem.texto}`}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
