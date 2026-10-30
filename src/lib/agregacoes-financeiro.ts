import type { VendaFinanceiro } from "./tipos-api";

/** Uma linha de tabela agrupada — dimensão (canal/forma de pagamento/closer/produto) + totais. */
export interface LinhaAgrupada {
  chave: string;
  rotulo: string;
  vendas: number;
  bruto: number;
  pago: number;
  liquido: number;
}

export interface ItemCanonico {
  chave: string;
  rotulo: string;
}

function linhaVazia(chave: string, rotulo: string): LinhaAgrupada {
  return { chave, rotulo, vendas: 0, bruto: 0, pago: 0, liquido: 0 };
}

/** Uma contribuição já resolvida (chave + valores) — uma venda gera 1. `vendas` é 1 só se a venda é do período. */
interface Contribuicao {
  chave: string;
  rotulo: string;
  vendas: 0 | 1;
  bruto: number;
  pago: number;
  liquido: number;
}

/** Agrupa contribuições já resolvidas. A lista canônica sai sempre na frente, na ordem dada, mesmo zerada; qualquer chave fora dela (closer inativo, forma de pagamento nova) é anexada no fim, na ordem em que aparece. */
function agruparContribuicoes(contribuicoes: Contribuicao[], canonicos: ItemCanonico[]): LinhaAgrupada[] {
  const porChave = new Map<string, LinhaAgrupada>();
  for (const item of canonicos) porChave.set(item.chave, linhaVazia(item.chave, item.rotulo));

  const extras: string[] = [];
  for (const c of contribuicoes) {
    let linha = porChave.get(c.chave);
    if (!linha) {
      linha = linhaVazia(c.chave, c.rotulo);
      porChave.set(c.chave, linha);
      extras.push(c.chave);
    }
    linha.vendas += c.vendas;
    linha.bruto += c.bruto;
    linha.pago += c.pago;
    linha.liquido += c.liquido;
  }

  return [...canonicos.map((c) => porChave.get(c.chave)!), ...extras.map((chave) => porChave.get(chave)!)];
}

/**
 * Agrupa `vendas` pela chave que `chaveDe` extrai de cada uma — usada por
 * canal/closer/produto. Como na planilha: `vendas`/`bruto` são só das vendas
 * com `data_venda` em `inicio..fim`; `pago`/`liquido` são o recebido nos meses
 * do período, de QUALQUER venda (uma venda fora do período entra só se tiver
 * recebimento nesses meses).
 */
export function agruparPor(
  vendas: VendaFinanceiro[],
  chaveDe: (venda: VendaFinanceiro) => ItemCanonico,
  canonicos: ItemCanonico[],
  inicio: string,
  fim: string,
): LinhaAgrupada[] {
  const meses = new Set(mesesDoPeriodo(inicio, fim));
  const contribuicoes: Contribuicao[] = [];

  for (const venda of vendas) {
    const dia = venda.data_venda.slice(0, 10);
    const doPeriodo = dia >= inicio && dia <= fim;
    const temRecebimentoNoPeriodo = venda.recebimentos.some((r) => meses.has(r.mes));
    if (!doPeriodo && !temRecebimentoNoPeriodo) continue;

    const { chave, rotulo } = chaveDe(venda);
    const recebido = recebidoNosMeses(venda, meses);
    contribuicoes.push({
      chave,
      rotulo,
      vendas: doPeriodo ? 1 : 0,
      bruto: doPeriodo ? venda.valor_bruto_contrato : 0,
      pago: recebido.pago,
      liquido: recebido.liquido,
    });
  }

  return agruparContribuicoes(contribuicoes, canonicos);
}

/**
 * "Como entrou o dinheiro": todo o PAGO/LÍQUIDO recebido nos meses do período
 * vai para a forma da ENTRADA (`metodo_pagamento`), igual à planilha — o
 * calendário não diz a forma de cada parcela, então não há rateio do segundo
 * pagamento. A forma não conta venda nem bruto: `vendas` e `bruto` saem zerados.
 */
export function agruparPorFormaPagamento(
  vendas: VendaFinanceiro[],
  canonicos: ItemCanonico[],
  inicio: string,
  fim: string,
): LinhaAgrupada[] {
  return agruparPor(vendas, chaveMetodoPagamento, canonicos, inicio, fim).map((linha) => ({ ...linha, vendas: 0, bruto: 0 }));
}

/** Linha de total do rodapé — soma todas as linhas (canônicas + extras) de uma tabela agrupada. */
export function totalDeLinhas(linhas: LinhaAgrupada[]): LinhaAgrupada {
  const total = linhaVazia("__total__", "Total");
  for (const linha of linhas) {
    total.vendas += linha.vendas;
    total.bruto += linha.bruto;
    total.pago += linha.pago;
    total.liquido += linha.liquido;
  }
  return total;
}

export interface TotaisFinanceiro {
  vendido: number;
  contratos: number;
  ticketMedio: number | null;
  pago: number;
  pagoDeVendasDoPeriodo: number;
  liquido: number;
  descontos: number;
}

/** Recebimentos de uma venda cujo `mes` está em `meses` — a planilha conta o dinheiro pelo mês do recebimento, não pela data da venda. */
function recebidoNosMeses(venda: VendaFinanceiro, meses: Set<string>): { pago: number; liquido: number } {
  return venda.recebimentos.reduce(
    (acc, r) => (meses.has(r.mes) ? { pago: acc.pago + r.pago, liquido: acc.liquido + r.liquido } : acc),
    { pago: 0, liquido: 0 },
  );
}

/**
 * Cards 1/2/3 como na planilha: `vendido`/contratos/ticket são das vendas com
 * `data_venda` em `inicio..fim`; `pago`/`liquido` são o recebido nos meses do
 * período, de QUALQUER venda; `pagoDeVendasDoPeriodo` é o pago só das vendas do período.
 */
export function totaisDoPeriodo(vendas: VendaFinanceiro[], inicio: string, fim: string): TotaisFinanceiro {
  const meses = new Set(mesesDoPeriodo(inicio, fim));
  const doPeriodo = vendas.filter((v) => {
    const dia = v.data_venda.slice(0, 10);
    return dia >= inicio && dia <= fim;
  });

  const vendido = doPeriodo.reduce((acc, v) => acc + v.valor_bruto_contrato, 0);
  const contratos = doPeriodo.length;
  const pagoDeVendasDoPeriodo = doPeriodo.reduce((acc, v) => acc + recebidoNosMeses(v, meses).pago, 0);

  let pago = 0;
  let liquido = 0;
  for (const v of vendas) {
    const recebido = recebidoNosMeses(v, meses);
    pago += recebido.pago;
    liquido += recebido.liquido;
  }

  return {
    vendido,
    contratos,
    ticketMedio: contratos > 0 ? vendido / contratos : null,
    pago,
    pagoDeVendasDoPeriodo,
    liquido,
    descontos: pago - liquido,
  };
}

export interface ResumoAno {
  brutoNoAno: number;
  pagoNoAno: number;
  liquidoNoAno: number;
  descontosMedios: number | null;
  aReceber: number;
  restanteSemData: number;
}

/**
 * Números do ano como na planilha. `pagoNoAno`/`liquidoNoAno` são o recebido
 * nos meses do `ano`, de QUALQUER venda; `brutoNoAno`, `aReceber` e
 * `restanteSemData` olham só as vendas com `data_venda` no `ano`.
 * `aReceber` = bruto − pago até o mês `ate` (AAAA-MM, inclusive);
 * `restanteSemData` = bruto − pago do ano.
 */
export function resumoDoAno(vendas: VendaFinanceiro[], ano: string, ate: string): ResumoAno {
  let pagoNoAno = 0;
  let liquidoNoAno = 0;
  for (const v of vendas) {
    for (const r of v.recebimentos) {
      if (r.mes.startsWith(ano)) {
        pagoNoAno += r.pago;
        liquidoNoAno += r.liquido;
      }
    }
  }

  const doAno = vendas.filter((v) => v.data_venda.startsWith(ano));
  const brutoNoAno = doAno.reduce((acc, v) => acc + v.valor_bruto_contrato, 0);
  let aReceber = 0;
  let restanteSemData = 0;
  for (const v of doAno) {
    const pagoAteMes = v.recebimentos.reduce((acc, r) => (r.mes <= ate ? acc + r.pago : acc), 0);
    const pagoDoAno = v.recebimentos.reduce((acc, r) => (r.mes.startsWith(ano) ? acc + r.pago : acc), 0);
    aReceber += Math.max(0, v.valor_bruto_contrato - pagoAteMes);
    restanteSemData += Math.max(0, v.valor_bruto_contrato - pagoDoAno);
  }

  return {
    brutoNoAno,
    pagoNoAno,
    liquidoNoAno,
    descontosMedios: pagoNoAno > 0 ? 1 - liquidoNoAno / pagoNoAno : null,
    aReceber,
    restanteSemData,
  };
}

/**
 * Uma linha do "Resultado mês a mês" da planilha (DASHBOARD, linhas 18–24).
 * `vendido`/`contratos`/ticket são das vendas com `data_venda` no mês;
 * `recebimentoBruto`/`liquidouVendasDoMes` são o PAGO/LÍQUIDO do mês dessas
 * mesmas vendas; `totalRecebido` é o LÍQUIDO do mês de TODAS as vendas e
 * `parcelasAnteriores` = `totalRecebido − liquidouVendasDoMes`. "Parcelas
 * anteriores" e "total recebido" usam LÍQUIDO, como a planilha.
 */
export interface PontoSerieMensal {
  mes: string; // AAAA-MM, ou "total" em `totalSerie`
  vendido: number;
  recebimentoBruto: number;
  liquidouVendasDoMes: number;
  parcelasAnteriores: number;
  totalRecebido: number;
  contratos: number;
  ticketMedio: number | null;
}

/** 12 pontos (jan..dez de `ano`), um por mês do calendário — meses sem venda saem zerados (ticket `null`). */
export function serieMensal(vendas: VendaFinanceiro[], ano: string): PontoSerieMensal[] {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = `${ano}-${String(i + 1).padStart(2, "0")}`;
    const meses = new Set([mes]);
    const doMes = vendas.filter((v) => v.data_venda.slice(0, 7) === mes);

    const vendido = doMes.reduce((acc, v) => acc + v.valor_bruto_contrato, 0);
    const recebimentoBruto = doMes.reduce((acc, v) => acc + recebidoNosMeses(v, meses).pago, 0);
    const liquidouVendasDoMes = doMes.reduce((acc, v) => acc + recebidoNosMeses(v, meses).liquido, 0);
    const totalRecebido = vendas.reduce((acc, v) => acc + recebidoNosMeses(v, meses).liquido, 0);
    const contratos = doMes.length;

    return {
      mes,
      vendido,
      recebimentoBruto,
      liquidouVendasDoMes,
      parcelasAnteriores: totalRecebido - liquidouVendasDoMes,
      totalRecebido,
      contratos,
      ticketMedio: contratos > 0 ? vendido / contratos : null,
    };
  });
}

/** Linha de total do "Resultado mês a mês": soma os meses, recalcula o ticket sobre o total e sai com `mes: "total"`. */
export function totalSerie(pontos: PontoSerieMensal[]): PontoSerieMensal {
  const soma = (campo: Exclude<keyof PontoSerieMensal, "mes" | "ticketMedio">) => pontos.reduce((acc, p) => acc + p[campo], 0);
  const vendido = soma("vendido");
  const contratos = soma("contratos");

  return {
    mes: "total",
    vendido,
    recebimentoBruto: soma("recebimentoBruto"),
    liquidouVendasDoMes: soma("liquidouVendasDoMes"),
    parcelasAnteriores: soma("parcelasAnteriores"),
    totalRecebido: soma("totalRecebido"),
    contratos,
    ticketMedio: contratos > 0 ? vendido / contratos : null,
  };
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

/** Listas canônicas fixas — vêm dos valores reais observados no banco (ver docs/plans/pagina-financeiro-cards-graficos-tabelas.md). */
export const CANAIS_CANONICOS: ItemCanonico[] = [
  { chave: "LinkedIn", rotulo: "LinkedIn" },
  { chave: "Indicação", rotulo: "Indicação" },
  { chave: "Evento", rotulo: "Evento" },
  { chave: "Instagram", rotulo: "Instagram" },
  { chave: "Dripify", rotulo: "Dripify" },
  { chave: "Upsell", rotulo: "Upsell" },
  { chave: "Outros", rotulo: "Outros" },
];

export const METODOS_PAGAMENTO_CANONICOS: ItemCanonico[] = [
  { chave: "PIX", rotulo: "PIX" },
  { chave: "Cartão", rotulo: "Cartão" },
  { chave: "Boleto", rotulo: "Boleto" },
  { chave: "Transferência", rotulo: "Transferência" },
  { chave: "Dinheiro", rotulo: "Dinheiro" },
  { chave: "Não informado", rotulo: "Não informado" },
];

export const PRODUTOS_CANONICOS: ItemCanonico[] = [
  { chave: "Produto de Entrada", rotulo: "Produto de Entrada" },
  { chave: "Produto de Ativação", rotulo: "Produto de Ativação" },
  { chave: "Produto de Aceleração", rotulo: "Produto de Aceleração" },
  { chave: "KeepSide", rotulo: "KeepSide" },
];

export function chaveCanal(venda: VendaFinanceiro): ItemCanonico {
  return venda.canal ? { chave: venda.canal, rotulo: venda.canal } : { chave: "__sem_canal__", rotulo: "Sem canal" };
}

export function chaveMetodoPagamento(venda: VendaFinanceiro): ItemCanonico {
  const valor = venda.metodo_pagamento;
  return valor ? { chave: valor, rotulo: valor } : { chave: "Não informado", rotulo: "Não informado" };
}

export function chaveProduto(venda: VendaFinanceiro): ItemCanonico {
  return venda.produto ? { chave: venda.produto, rotulo: venda.produto } : { chave: "__sem_produto__", rotulo: "Sem produto" };
}

export function chaveCloser(venda: VendaFinanceiro): ItemCanonico {
  if (venda.user_closer === null) return { chave: "__sem_closer__", rotulo: "Sem closer definido" };
  return { chave: String(venda.user_closer), rotulo: venda.closer ?? "Sem closer definido" };
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
