import { formatarNumero } from "../lib/formato";
import { extremosPorColuna, formatarTaxa, type ColunaFunil, type ExtremosColuna, type LinhaFunil } from "../lib/funil";

const CABECALHO = "text-[13px] font-semibold uppercase tracking-[0.08em] text-muted";

function formatarValor(coluna: ColunaFunil, valor: number | null): string {
  if (coluna.tipo === "taxa") return formatarTaxa(valor);
  return valor === null ? "—" : formatarNumero(valor);
}

function celulas(colunas: ColunaFunil[], linha: LinhaFunil, extremos: ExtremosColuna | null) {
  return colunas.map((c) => {
    const valor = linha.valores[c.chave] ?? null;
    const e = extremos?.[c.chave];
    const extremo = e ? (e.melhor === linha.nome ? "melhor" : e.pior === linha.nome ? "pior" : undefined) : undefined;
    const classeExtremo = extremo === "melhor" ? " font-bold text-ok" : extremo === "pior" ? " font-bold text-bad" : "";
    return (
      <td
        key={c.chave}
        data-extremo={extremo}
        title={extremo === "melhor" ? "Melhor taxa" : extremo === "pior" ? "Pior taxa" : undefined}
        className={`px-3 py-3 align-middle${classeExtremo}`}
      >
        {formatarValor(c, valor)}
        {c.tipo === "taxa" && valor !== null && (
          <div data-barra-taxa className="mt-1 h-1 w-full rounded-full bg-track">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(Math.min(Math.max(valor, 0), 1) * 1000) / 10}%` }} />
          </div>
        )}
      </td>
    );
  });
}

/**
 * Tabela de um funil por conta (LinkedIn ou Instagram): uma linha por conta, mais TOTAL
 * no rodapé. `destacada` marca a conta selecionada no filtro (`aria-current`).
 */
export function TabelaContasFunil({ titulo, rotuloConta, colunas, linhas, total, destacada }: { titulo: string; rotuloConta: string; colunas: ColunaFunil[]; linhas: LinhaFunil[]; total: LinhaFunil; destacada?: string | null }) {
  const extremos = extremosPorColuna(colunas, linhas);
  return (
    <article className="glass-panel flex min-w-0 flex-col gap-3 rounded-[24px] p-5">
      <h3 className="text-[15px] font-bold uppercase tracking-[0.13em]">{titulo}</h3>
      <div className="overflow-x-auto">
        <table aria-label={titulo} className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={`py-2 pr-3 ${CABECALHO}`}>
                {rotuloConta}
              </th>
              {colunas.map((c) => (
                <th key={c.chave} scope="col" className={`px-3 py-2 ${CABECALHO}`}>
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => {
              const ativa = linha.nome === destacada;
              return (
                <tr key={linha.nome} aria-current={ativa ? "true" : undefined} className={`border-b border-line last:border-0 ${ativa ? "bg-surface-2" : ""}`}>
                  <td className="py-3 pr-3 text-[16px] font-bold">{linha.nome}</td>
                  {celulas(colunas, linha, extremos)}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line font-bold">
              <td className="py-3 pr-3">{total.nome}</td>
              {celulas(colunas, total, null)}
            </tr>
          </tfoot>
        </table>
      </div>
    </article>
  );
}
