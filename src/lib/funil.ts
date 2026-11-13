import { METRICAS_CONTA, type ContaFunil, type MetricasConta } from "./tipos-api";

/** Soma as métricas das contas; `conta` com o nome de uma conta filtra só ela, senão (null ou inexistente) soma todas. */
export function somarContas(contas: ContaFunil[], conta: string | null): MetricasConta {
  const selecionadas = contas.some((c) => c.nome === conta) ? contas.filter((c) => c.nome === conta) : contas;
  const soma = Object.fromEntries(METRICAS_CONTA.map((k) => [k, 0])) as MetricasConta;
  for (const c of selecionadas) {
    for (const k of METRICAS_CONTA) soma[k] += c.metricas[k];
  }
  return soma;
}

/** Razão parte ÷ total; `null` quando o total é zero (divisão indefinida). */
export function razao(parte: number, total: number): number | null {
  return total === 0 ? null : parte / total;
}

export interface TaxasLinkedin {
  aceitacao: number | null;
  abordados: number | null;
  resposta: number | null;
  conversaoNumero: number | null;
  conversaoTotal: number | null;
  followsPorAbordagem: number | null;
}

/** Taxas do funil LinkedIn como na planilha (frações 0–1, exceto `followsPorAbordagem`, razão simples). */
export function taxasLinkedin(m: MetricasConta): TaxasLinkedin {
  return {
    aceitacao: razao(m.conexoes_aceitas, m.conexoes_enviadas),
    abordados: razao(m.mensagens_abordagem, m.conexoes_aceitas),
    resposta: razao(m.respondidos, m.mensagens_abordagem),
    conversaoNumero: razao(m.numeros_captados, m.respondidos),
    conversaoTotal: razao(m.numeros_captados, m.conexoes_enviadas),
    followsPorAbordagem: razao(m.follows_abordagem, m.mensagens_abordagem),
  };
}

export interface TaxasInstagram {
  resposta: number | null;
  conversaoNumero: number | null;
  conversaoTotal: number | null;
  fupsPorAbordagem: number | null;
}

/** Taxas do funil Instagram (frações 0–1, exceto `fupsPorAbordagem`, razão simples). */
export function taxasInstagram(m: MetricasConta): TaxasInstagram {
  return {
    resposta: razao(m.respondidos, m.abordagens),
    conversaoNumero: razao(m.numeros_captados, m.respondidos),
    conversaoTotal: razao(m.numeros_captados, m.abordagens),
    fupsPorAbordagem: razao(m.fups, m.abordagens),
  };
}

const UMA_CASA = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Formata fração como porcentagem pt-BR com 1 casa ("58,0%"); `null` vira "—". */
export function formatarTaxa(v: number | null): string {
  if (v === null) return "—";
  return UMA_CASA.format(v * 100) + "%";
}

/** Formata número com 1 casa pt-BR ("0,8"); `null` vira "—". */
export function umaCasa(v: number | null): string {
  if (v === null) return "—";
  return UMA_CASA.format(v);
}

export interface ColunaFunil {
  chave: string;
  rotulo: string;
  tipo: "numero" | "taxa";
}

export interface LinhaFunil {
  nome: string;
  valores: Record<string, number | null>;
}
