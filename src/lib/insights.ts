import type { Metrica, PessoaComercial, SerieDiariaDia } from "./tipos-api";

export interface ContagemStatus {
  atingido: number;
  abaixo_da_meta: number;
  sem_preenchimento: number;
  sem_meta: number;
}

function semLancamento(m: Metrica): boolean {
  return m.status === "sem_preenchimento";
}

function lancada(m: Metrica): boolean {
  return !semLancamento(m);
}

export interface Consolidado {
  realizadoTotal: number;
  metaTotal: number;
  /** null quando metaTotal é 0 — sem base pra comparar. */
  pctGeral: number | null;
  contagemStatus: ContagemStatus;
  /** null quando não há nenhuma métrica considerada (total 0). */
  coberturaLancto: number | null;
}

/** Consolidado do time (ou da seleção filtrada) — base do hero, do donut e da linha de contexto. */
export function agregarConsolidado(pessoas: PessoaComercial[]): Consolidado {
  let realizadoTotal = 0;
  let metaTotal = 0;
  const contagemStatus: ContagemStatus = { atingido: 0, abaixo_da_meta: 0, sem_preenchimento: 0, sem_meta: 0 };

  for (const pessoa of pessoas) {
    for (const metrica of pessoa.metricas) {
      if (lancada(metrica)) realizadoTotal += metrica.realizado;
      if (metrica.meta_periodo !== null) metaTotal += metrica.meta_periodo;
      contagemStatus[metrica.status] += 1;
    }
  }

  const total = contagemStatus.atingido + contagemStatus.abaixo_da_meta + contagemStatus.sem_preenchimento + contagemStatus.sem_meta;
  const lancadas = contagemStatus.atingido + contagemStatus.abaixo_da_meta;

  return {
    realizadoTotal,
    metaTotal,
    pctGeral: metaTotal > 0 ? realizadoTotal / metaTotal : null,
    contagemStatus,
    coberturaLancto: total > 0 ? lancadas / total : null,
  };
}

export interface MetricaAgregada {
  metrica: string;
  nomeExibicao: string;
  /** null quando NENHUMA pessoa tem meta cadastrada pra essa métrica — nunca 0. */
  meta: number | null;
  realizado: number;
  lancadas: number;
  total: number;
  diasComLacuna: number;
  /** null quando ninguém lançou essa métrica ainda ou não há meta. */
  pct: number | null;
}

/** Meta e realizado somados do time inteiro, por métrica — base do gráfico de colunas e da tabela. */
export function agregarPorMetrica(pessoas: PessoaComercial[]): MetricaAgregada[] {
  const acumulado = new Map<
    string,
    {
      nomeExibicao: string;
      meta: number;
      temMeta: boolean;
      realizado: number;
      lancadas: number;
      total: number;
      diasComLacuna: number;
    }
  >();

  for (const pessoa of pessoas) {
    for (const metrica of pessoa.metricas) {
      const atual = acumulado.get(metrica.metrica) ?? {
        nomeExibicao: metrica.nome_exibicao,
        meta: 0,
        temMeta: false,
        realizado: 0,
        lancadas: 0,
        total: 0,
        diasComLacuna: 0,
      };
      atual.total += 1;
      atual.diasComLacuna += metrica.dias_com_lacuna;
      if (lancada(metrica)) {
        atual.realizado += metrica.realizado;
        atual.lancadas += 1;
      }
      if (metrica.meta_periodo !== null) {
        atual.meta += metrica.meta_periodo;
        atual.temMeta = true;
      }
      acumulado.set(metrica.metrica, atual);
    }
  }

  return Array.from(acumulado.entries()).map(([metrica, v]) => ({
    metrica,
    nomeExibicao: v.nomeExibicao,
    meta: v.temMeta ? v.meta : null,
    realizado: v.realizado,
    lancadas: v.lancadas,
    total: v.total,
    diasComLacuna: v.diasComLacuna,
    pct: v.temMeta && v.lancadas > 0 && v.meta > 0 ? v.realizado / v.meta : null,
  }));
}

/** Total do time por dia, para uma métrica escolhida — base do gráfico de linha. */
export function serieDoTimePorMetrica(serieDiaria: SerieDiariaDia[], metrica: string): { dia: string; valor: number }[] {
  return serieDiaria.map((d) => ({ dia: d.dia, valor: d.metricas[metrica] ?? 0 }));
}
