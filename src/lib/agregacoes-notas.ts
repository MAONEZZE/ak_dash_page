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

export interface PontoSerieMensal {
  mes: string;
  faturamento: number;
  receita: number;
  receitaComercial: number;
  receitaBase: number;
  vendas: number;
  ticketMedio: number | null;
}

export function serieMensal(notas: NotaFinanceiro[], ano: string): PontoSerieMensal[] {
  const pontos: PontoSerieMensal[] = [];
  for (let m = 1; m <= 12; m++) {
    const mes = `${ano}-${String(m).padStart(2, "0")}`;
    pontos.push({ mes, ...totaisDoPeriodo(notas, `${mes}-01`, `${mes}-31`) });
  }
  return pontos;
}

export function totalSerie(pontos: PontoSerieMensal[]): PontoSerieMensal {
  const soma = (campo: "faturamento" | "receita" | "receitaComercial" | "receitaBase" | "vendas") =>
    pontos.reduce((acc, p) => acc + p[campo], 0);
  const faturamento = soma("faturamento");
  const vendas = soma("vendas");
  return {
    mes: "total",
    faturamento,
    receita: soma("receita"),
    receitaComercial: soma("receitaComercial"),
    receitaBase: soma("receitaBase"),
    vendas,
    ticketMedio: vendas > 0 ? faturamento / vendas : null,
  };
}

export function acumuladoDoAno(notas: NotaFinanceiro[], ano: string): { faturamento: number; receita: number } {
  const t = totaisDoPeriodo(notas, `${ano}-01-01`, `${ano}-12-31`);
  return { faturamento: t.faturamento, receita: t.receita };
}

export interface LinhaAgrupada {
  chave: string;
  rotulo: string;
  vendas: number;
  faturamento: number;
  receita: number;
}

export interface ItemCanonico {
  chave: string;
  rotulo: string;
}

export const CANAIS_CANONICOS: ItemCanonico[] = ["LinkedIn", "Indicação", "Instagram", "Evento", "Cliente"].map((c) => ({ chave: c, rotulo: c }));

function linhaVazia(chave: string, rotulo: string): LinhaAgrupada {
  return { chave, rotulo, vendas: 0, faturamento: 0, receita: 0 };
}

/** Agrupa contribuições já resolvidas. Canônicos saem sempre na frente, na ordem dada, mesmo zerados; chave fora da lista é anexada no fim, na ordem em que aparece, só se `aceitarExtras`. */
function agrupar(canonicos: ItemCanonico[], contribuicoes: LinhaAgrupada[], aceitarExtras: boolean): LinhaAgrupada[] {
  const porChave = new Map<string, LinhaAgrupada>();
  for (const item of canonicos) porChave.set(item.chave, linhaVazia(item.chave, item.rotulo));

  const extras: string[] = [];
  for (const c of contribuicoes) {
    let linha = porChave.get(c.chave);
    if (!linha) {
      if (!aceitarExtras) continue;
      linha = linhaVazia(c.chave, c.rotulo);
      porChave.set(c.chave, linha);
      extras.push(c.chave);
    }
    linha.vendas += c.vendas;
    linha.faturamento += c.faturamento;
    linha.receita += c.receita;
  }

  return [...canonicos.map((c) => porChave.get(c.chave)!), ...extras.map((chave) => porChave.get(chave)!)];
}

/** Por canal: só notas com data_referencia em `inicio..fim`; faturamento e vendas da data. */
export function agruparPorCanal(notas: NotaFinanceiro[], inicio: string, fim: string): LinhaAgrupada[] {
  const contribuicoes = notas.filter((n) => naData(n, inicio, fim)).map((n) => ({
    chave: n.canal ?? "__sem_canal__",
    rotulo: n.canal ?? "Sem canal",
    vendas: ehVenda(n) ? 1 : 0,
    faturamento: n.valor_venda,
    receita: 0,
  }));
  return agrupar(CANAIS_CANONICOS, contribuicoes, true);
}

export const FORMAS_CANONICAS: ItemCanonico[] = ["PIX", "Cartão", "Boleto"].map((c) => ({ chave: c, rotulo: c }));

/** Por forma de pagamento: receita (valor_pago) das notas cujo mês da aba cai em `inicio..fim`. "Outros" só aparece com valor. */
export function agruparPorForma(notas: NotaFinanceiro[], inicio: string, fim: string): LinhaAgrupada[] {
  const meses = new Set(mesesDoPeriodo(inicio, fim));
  const contribuicoes = notas.filter((n) => meses.has(n.mes)).map((n) => ({
    chave: n.forma_pagamento,
    rotulo: n.forma_pagamento,
    vendas: 0,
    faturamento: 0,
    receita: n.valor_pago,
  }));
  return agrupar(FORMAS_CANONICAS, contribuicoes, true).filter((l) => !(l.chave === "Outros" && l.receita === 0));
}

export const PRODUTOS_CANONICOS: ItemCanonico[] = ["Ativação", "Tração", "Aceleração", "The Green House"].map((c) => ({ chave: c, rotulo: c }));

/** Por produto: faturamento e vendas pela data_referencia, receita pelo mês da aba. Só os produtos canônicos saem; notas sem produto são ignoradas. */
export function agruparPorProduto(notas: NotaFinanceiro[], inicio: string, fim: string): LinhaAgrupada[] {
  const meses = new Set(mesesDoPeriodo(inicio, fim));
  const contribuicoes = notas.flatMap((n) => {
    const produto = n.produto;
    if (produto === null) return [];
    const dentroDaData = naData(n, inicio, fim);
    const noMes = meses.has(n.mes);
    if (!dentroDaData && !noMes) return [];
    return [{
      chave: produto,
      rotulo: produto,
      vendas: dentroDaData && ehVenda(n) ? 1 : 0,
      faturamento: dentroDaData ? n.valor_venda : 0,
      receita: noMes ? n.valor_pago : 0,
    }];
  });
  return agrupar(PRODUTOS_CANONICOS, contribuicoes, false);
}

export function totalDeLinhas(linhas: LinhaAgrupada[]): LinhaAgrupada {
  return linhas.reduce(
    (acc, l) => ({ ...acc, vendas: acc.vendas + l.vendas, faturamento: acc.faturamento + l.faturamento, receita: acc.receita + l.receita }),
    { chave: "__total__", rotulo: "Total", vendas: 0, faturamento: 0, receita: 0 },
  );
}

/**
 * Teto do eixo Y dos gráficos de linha: `piso` quando nenhum valor o
 * ultrapassa, senão o próximo múltiplo de `multiplo` acima do maior valor —
 * "teto elástico" (ver GraficoLinhasFinanceiro).
 */
export function tetoElastico(valores: number[], piso: number, multiplo: number): number {
  const max = Math.max(0, ...valores);
  if (max <= piso) return piso;
  return Math.ceil(max / multiplo) * multiplo;
}
