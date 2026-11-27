/** Cálculos da página Financeiro sobre as notas das abas NFS (ver docs/plans/financeiro-nfs.md). Receita = valor_pago pelo mês da aba; faturamento = valor_venda e nº de vendas pela data_referencia. */
import type { NotaFinanceiro } from "./tipos-api";

export function ehVenda(n: NotaFinanceiro): boolean {
  return n.categoria === "venda nova" || n.categoria === "upsell";
}

/** Meses AAAA-MM tocados por `inicio..fim` (AAAA-MM-DD), na ordem, cruzando a virada do ano se preciso. */
export function mesesDoPeriodo(inicio: string, fim: string): string[] {
  const meses: string[] = [];
  let ano = Number(inicio.slice(0, 4));
  let mes = Number(inicio.slice(5, 7));
  const anoFim = Number(fim.slice(0, 4));
  const mesFim = Number(fim.slice(5, 7));

  while (ano < anoFim || (ano === anoFim && mes <= mesFim)) {
    meses.push(`${ano}-${String(mes).padStart(2, "0")}`);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }

  return meses;
}

function naData(n: NotaFinanceiro, inicio: string, fim: string): boolean {
  return n.data_referencia >= inicio && n.data_referencia <= fim;
}

export interface TotaisFinanceiro {
  faturamento: number;
  vendas: number;
  ticketMedio: number | null;
  receita: number;
  receitaComercial: number;
  receitaBase: number;
}

export function totaisDoPeriodo(notas: NotaFinanceiro[], inicio: string, fim: string): TotaisFinanceiro {
  const doPeriodo = notas.filter((n) => naData(n, inicio, fim));
  const faturamento = doPeriodo.reduce((acc, n) => acc + n.valor_venda, 0);
  const vendas = doPeriodo.filter(ehVenda).length;

  const meses = new Set(mesesDoPeriodo(inicio, fim));
  const recebidasNoPeriodo = notas.filter((n) => meses.has(n.mes));
  const somaPago = (filtro: (n: NotaFinanceiro) => boolean) => recebidasNoPeriodo.filter(filtro).reduce((acc, n) => acc + n.valor_pago, 0);

  return {
    faturamento,
    vendas,
    ticketMedio: vendas > 0 ? faturamento / vendas : null,
    receita: somaPago(() => true),
    receitaComercial: somaPago((n) => n.categoria === "venda nova"),
    receitaBase: somaPago((n) => n.categoria === "mensalidade cliente" || n.categoria === "upsell"),
  };
}
