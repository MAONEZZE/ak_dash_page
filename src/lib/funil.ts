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
