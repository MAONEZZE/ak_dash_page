import type { LinhaAgrupada } from "../lib/agregacoes-financeiro";

export interface ColunaAgrupada {
  titulo: string;
  valor: (linha: LinhaAgrupada) => string;
}

type Tamanho = "compacto" | "grande";

interface Props {
  titulo: string;
  colunaRotulo: string;
  linhas: LinhaAgrupada[];
  colunas: ColunaAgrupada[];
  total: LinhaAgrupada;
  /** "grande" — 1.3x o "compacto" (texto e respiro vertical das linhas), usado nas 3 tabelas de baixo (metodo/closer/produto) a pedido. */
  tamanho?: Tamanho;
}

interface EscalaTabela {
  painel: string;
  titulo: string;
  cabecalho: string;
  padCabecalho: string;
  celula: string;
  padCelula: string;
  padTotal: string;
}

const ESCALA: Record<Tamanho, EscalaTabela> = {
  compacto: {
    painel: "px-[clamp(14px,1.2vw,21px)] py-[clamp(10px,1.3vh,16px)]",
    titulo: "text-[clamp(14px,1.6vh,18px)]",
    cabecalho: "text-[clamp(10px,1.15vh,13px)]",
    padCabecalho: "py-[clamp(4px,0.7vh,8px)]",
    celula: "text-[clamp(12px,1.45vh,16px)]",
    padCelula: "py-[clamp(3px,0.55vh,7px)]",
    padTotal: "py-[clamp(4px,0.7vh,8px)]",
  },
  // 1.3x o "compacto" em texto e no respiro vertical das linhas.
  grande: {
    painel: "px-[clamp(18px,1.6vw,27px)] py-[clamp(13px,1.7vh,21px)]",
    titulo: "text-[clamp(18px,2.1vh,23px)]",
    cabecalho: "text-[clamp(13px,1.5vh,17px)]",
    padCabecalho: "py-[clamp(5px,0.9vh,10px)]",
    celula: "text-[clamp(16px,1.9vh,21px)]",
    padCelula: "py-[clamp(4px,0.7vh,9px)]",
    padTotal: "py-[clamp(5px,0.9vh,10px)]",
  },
};

/** Tabela estática (sem clique) dirigida por config de colunas — mesma estrutura nas 4 tabelas da Financeiro (dimensão + N colunas numéricas + linha de total). */
export function TabelaAgrupada({ titulo, colunaRotulo, linhas, colunas, total, tamanho = "compacto" }: Props) {
  const e = ESCALA[tamanho];

  return (
    <article className={`glass-panel flex min-h-0 w-full min-w-0 flex-col gap-2 overflow-auto rounded-2xl ${e.painel}`}>
      <span className={`font-semibold uppercase leading-none tracking-[0.13em] text-fg/56 ${e.titulo}`}>{titulo}</span>
      <table className="w-full flex-1 border-collapse">
        <thead>
          <tr className="border-b border-border-2">
            <th className={`${e.padCabecalho} pr-3 text-left font-semibold uppercase leading-none tracking-[0.08em] text-fg/50 ${e.cabecalho}`}>
              {colunaRotulo}
            </th>
            {colunas.map((c) => (
              <th
                key={c.titulo}
                className={`px-3 ${e.padCabecalho} text-right font-semibold uppercase leading-none tracking-[0.08em] text-fg/50 ${e.cabecalho}`}
              >
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.chave} className="border-b border-border-2 last:border-0">
              <td className={`${e.padCelula} pr-3 font-semibold leading-none tracking-tight ${e.celula}`}>{linha.rotulo}</td>
              {colunas.map((c) => (
                <td key={c.titulo} className={`whitespace-nowrap px-3 ${e.padCelula} text-right font-display font-bold leading-none tracking-tight ${e.celula}`}>
                  {c.valor(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border-2">
            <td className={`${e.padTotal} pr-3 font-bold leading-none tracking-tight ${e.celula}`}>{total.rotulo}</td>
            {colunas.map((c) => (
              <td key={c.titulo} className={`whitespace-nowrap px-3 ${e.padTotal} text-right font-display font-bold leading-none tracking-tight ${e.celula}`}>
                {c.valor(total)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </article>
  );
}
