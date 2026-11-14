import { formatarNumero } from "../lib/formato";
import { formatarTaxa, largurasEtapas } from "../lib/funil";
import type { EtapaFunil } from "./FunilBarras";

export interface ContaMiniFunil {
  nome: string;
  etapas: EtapaFunil[];
  conversaoTotal: number | null;
}

/** Mini-funis lado a lado, um por conta, com valores por etapa e conversão total. */
export function MiniFunisContas({ titulo, contas }: { titulo: string; contas: ContaMiniFunil[] }) {
  return (
    <section aria-label={titulo} className="glass-panel flex min-w-0 flex-col gap-3 rounded-[24px] p-5">
      <h3 className="text-[15px] font-bold uppercase tracking-[0.13em]">{titulo}</h3>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {contas.map((conta) => {
          const larguras = largurasEtapas(conta.etapas.map((e) => e.valor));
          return (
            <li key={conta.nome}>
              <button type="button" className="flex w-full flex-col gap-2 rounded-[16px] border border-line p-3 text-left">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-[16px] font-bold">{conta.nome}</span>
                  <span className="font-display text-[18px] font-extrabold">{formatarTaxa(conta.conversaoTotal)}</span>
                </span>
                {conta.etapas.map((etapa, i) => (
                  <span key={etapa.rotulo} className="flex flex-col gap-1">
                    <span className="flex justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                      <span>{etapa.rotulo}</span>
                      <span>{formatarNumero(etapa.valor)}</span>
                    </span>
                    <span className="flex justify-center">
                      <span data-barra className="block h-2 rounded-full bg-brand" style={{ width: `${larguras[i]}%` }} />
                    </span>
                  </span>
                ))}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
