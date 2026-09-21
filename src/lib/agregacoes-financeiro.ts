import type { VendaFinanceiro } from "./tipos-api";

/** Uma linha de tabela agrupada — dimensão (canal/forma de pagamento/closer/produto) + totais. */
export interface LinhaAgrupada {
  chave: string;
  rotulo: string;
  vendas: number;
  bruto: number;
  pago: number;
  liquido: number;
  imposto: number;
  taxa: number;
}

export interface ItemCanonico {
  chave: string;
  rotulo: string;
}

function linhaVazia(chave: string, rotulo: string): LinhaAgrupada {
  return { chave, rotulo, vendas: 0, bruto: 0, pago: 0, liquido: 0, imposto: 0, taxa: 0 };
}

function somar(linha: LinhaAgrupada, venda: VendaFinanceiro): void {
  linha.vendas += 1;
  linha.bruto += venda.valor_bruto_contrato;
  linha.pago += venda.valor_entrada;
  linha.liquido += venda.liquido_entrada;
  linha.imposto += venda.valor_entrada * venda.imposto;
  linha.taxa += venda.valor_entrada * (1 - venda.imposto) * venda.taxa;
}

/**
 * Agrupa `vendas` pela chave que `chaveDe` extrai de cada uma. A lista
 * canônica sai sempre na frente, na ordem dada, mesmo zerada; qualquer chave
 * que apareça nas vendas e não esteja na lista canônica (closer inativo,
 * grafia nova) é anexada no fim, na ordem em que aparece.
 */
export function agruparPor(
  vendas: VendaFinanceiro[],
  chaveDe: (venda: VendaFinanceiro) => ItemCanonico,
  canonicos: ItemCanonico[],
): LinhaAgrupada[] {
  const porChave = new Map<string, LinhaAgrupada>();
  for (const item of canonicos) porChave.set(item.chave, linhaVazia(item.chave, item.rotulo));

  const extras: string[] = [];
  for (const venda of vendas) {
    const { chave, rotulo } = chaveDe(venda);
    let linha = porChave.get(chave);
    if (!linha) {
      linha = linhaVazia(chave, rotulo);
      porChave.set(chave, linha);
      extras.push(chave);
    }
    somar(linha, venda);
  }

  return [...canonicos.map((c) => porChave.get(c.chave)!), ...extras.map((chave) => porChave.get(chave)!)];
}

/** Linha de total do rodapé — soma todas as linhas (canônicas + extras) de uma tabela agrupada. */
export function totalDeLinhas(linhas: LinhaAgrupada[]): LinhaAgrupada {
  const total = linhaVazia("__total__", "Total");
  for (const linha of linhas) {
    total.vendas += linha.vendas;
    total.bruto += linha.bruto;
    total.pago += linha.pago;
    total.liquido += linha.liquido;
    total.imposto += linha.imposto;
    total.taxa += linha.taxa;
  }
  return total;
}

export interface TotaisFinanceiro {
  vendido: number;
  pago: number;
  liquido: number;
}

/** Somas simples do período já recortado — cards 1/2/3. */
export function totaisDoPeriodo(vendas: VendaFinanceiro[]): TotaisFinanceiro {
  return vendas.reduce(
    (acc, v) => ({
      vendido: acc.vendido + v.valor_bruto_contrato,
      pago: acc.pago + v.valor_entrada,
      liquido: acc.liquido + v.liquido_entrada,
    }),
    { vendido: 0, pago: 0, liquido: 0 },
  );
}

/** Card 4 (YTD): Σ valor_bruto_contrato de todo `vendas` (o ano inteiro buscado) com data_venda até `ate` (inclusive, AAAA-MM-DD). */
export function totalYtd(vendas: VendaFinanceiro[], ate: string): number {
  return vendas.reduce((acc, v) => (v.data_venda.slice(0, 10) <= ate ? acc + v.valor_bruto_contrato : acc), 0);
}

export interface PontoSerieMensal {
  mes: string; // AAAA-MM
  vendido: number;
  pago: number;
  liquido: number;
}

/** 12 pontos (jan..dez de `ano`), um por mês do calendário — meses sem venda saem com os três valores zerados. */
export function serieMensal(vendas: VendaFinanceiro[], ano: string): PontoSerieMensal[] {
  const pontos: PontoSerieMensal[] = Array.from({ length: 12 }, (_, i) => ({
    mes: `${ano}-${String(i + 1).padStart(2, "0")}`,
    vendido: 0,
    pago: 0,
    liquido: 0,
  }));

  for (const v of vendas) {
    const mes = v.data_venda.slice(0, 7);
    const ponto = pontos.find((p) => p.mes === mes);
    if (!ponto) continue;
    ponto.vendido += v.valor_bruto_contrato;
    ponto.pago += v.valor_entrada;
    ponto.liquido += v.liquido_entrada;
  }

  return pontos;
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
