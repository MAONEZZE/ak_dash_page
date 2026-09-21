import type { LinhaAgrupada } from "../lib/agregacoes-financeiro";

export interface ColunaAgrupada {
  titulo: string;
  valor: (linha: LinhaAgrupada) => string;
}

interface Props {
  titulo: string;
  colunaRotulo: string;
  linhas: LinhaAgrupada[];
  colunas: ColunaAgrupada[];
  total: LinhaAgrupada;
  /** "compacto" — texto menor, usado nas 3 tabelas da linha de baixo (metodo/closer/produto), que dividem a largura em 3 e têm mais colunas que "Por canal". */
  tamanho?: "normal" | "compacto";
}

const CABECALHO: Record<"normal" | "compacto", string> = {
  normal: "text-[clamp(12px,1.4vh,16px)]",
  compacto: "text-[clamp(10px,1.15vh,13px)]",
};
const CELULA: Record<"normal" | "compacto", string> = {
  normal: "text-[clamp(14px,1.75vh,20px)]",
  compacto: "text-[clamp(12px,1.45vh,16px)]",
};

/** Tabela estática (sem clique) dirigida por config de colunas — mesma estrutura nas 4 tabelas da Financeiro (dimensão + N colunas numéricas + linha de total). */
export function TabelaAgrupada({ titulo, colunaRotulo, linhas, colunas, total, tamanho = "normal" }: Props) {
  const cabecalho = CABECALHO[tamanho];
  const celula = CELULA[tamanho];

  return (
    <article className="glass-panel flex min-h-0 w-full min-w-0 flex-col gap-2 overflow-auto rounded-2xl px-[clamp(14px,1.2vw,21px)] py-[clamp(10px,1.3vh,16px)]">
      <span className="text-[clamp(14px,1.6vh,18px)] font-semibold uppercase leading-none tracking-[0.13em] text-fg/56">{titulo}</span>
      <table className="w-full flex-1 border-collapse">
        <thead>
          <tr className="border-b border-border-2">
            <th className={`py-[clamp(4px,0.7vh,8px)] pr-3 text-left font-semibold uppercase leading-none tracking-[0.08em] text-fg/50 ${cabecalho}`}>
              {colunaRotulo}
            </th>
            {colunas.map((c) => (
              <th
                key={c.titulo}
                className={`px-3 py-[clamp(4px,0.7vh,8px)] text-right font-semibold uppercase leading-none tracking-[0.08em] text-fg/50 ${cabecalho}`}
              >
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.chave} className="border-b border-border-2 last:border-0">
              <td className={`py-[clamp(3px,0.55vh,7px)] pr-3 font-semibold leading-none tracking-tight ${celula}`}>{linha.rotulo}</td>
              {colunas.map((c) => (
                <td
                  key={c.titulo}
                  className={`whitespace-nowrap px-3 py-[clamp(3px,0.55vh,7px)] text-right font-display font-bold leading-none tracking-tight ${celula}`}
                >
                  {c.valor(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border-2">
            <td className={`py-[clamp(4px,0.7vh,8px)] pr-3 font-bold leading-none tracking-tight ${celula}`}>{total.rotulo}</td>
            {colunas.map((c) => (
              <td
                key={c.titulo}
                className={`whitespace-nowrap px-3 py-[clamp(4px,0.7vh,8px)] text-right font-display font-bold leading-none tracking-tight ${celula}`}
              >
                {c.valor(total)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </article>
  );
}
