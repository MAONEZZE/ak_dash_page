import { calcularRitmo } from "./ritmo";
import type { DiasUteis, Metrica, PessoaComercial, SerieDiariaDia } from "./tipos-api";

function lancada(m: Metrica): boolean {
  return m.status !== "sem_preenchimento";
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

export interface ResumoMetas {
  /** Métricas com meta > 0 no período — o Y do "X/Y no ritmo". */
  comMeta: number;
  noRitmo: number;
  /** realizado ≥ meta. */
  batidas: number;
}

/** Resumo de metas de uma pessoa, só nas métricas listadas (as colunas da tabela do cargo). */
export function resumoMetas(metricas: Metrica[], chaves: readonly string[], dias: DiasUteis): ResumoMetas {
  const resumo: ResumoMetas = { comMeta: 0, noRitmo: 0, batidas: 0 };
  for (const m of metricas) {
    if (!chaves.includes(m.metrica) || !m.meta_periodo) continue;
    resumo.comMeta += 1;
    if (calcularRitmo(m.realizado, m.meta_periodo, dias).status === "no_ritmo") resumo.noRitmo += 1;
    if (m.realizado >= m.meta_periodo) resumo.batidas += 1;
  }
  return resumo;
}
