import { METRICAS_SEM_HISTORICO } from "./tipos-api";
import type { Metrica, PessoaComercial, SerieDiariaDia, StatusMetrica } from "./tipos-api";

export const ORDEM_STATUS: StatusMetrica[] = ["atingido", "abaixo_da_meta", "sem_preenchimento"];

export interface ContagemStatus {
  atingido: number;
  abaixo_da_meta: number;
  sem_preenchimento: number;
}

function semLancamento(m: Metrica): boolean {
  return m.status === "sem_preenchimento";
}

function atingida(m: Metrica): boolean {
  return m.status === "atingido";
}

function lancada(m: Metrica): boolean {
  return !semLancamento(m);
}

/** Métrica sem dado histórico algum em período fechado — sai das contagens de status, do metaTotal e ganha linha própria. */
export function naoDisponivel(m: Metrica, periodoParcial: boolean): boolean {
  return !periodoParcial && METRICAS_SEM_HISTORICO.has(m.metrica);
}

export interface Consolidado {
  realizadoTotal: number;
  metaTotal: number;
  /** null quando metaTotal é 0 — sem base pra comparar. */
  pctGeral: number | null;
  contagemStatus: ContagemStatus;
  /** null quando não há nenhuma métrica considerada (total 0). */
  coberturaLancto: number | null;
  naoDisponivelCount: number;
}

/** Consolidado do time (ou da seleção filtrada) — base do hero, do donut e da linha de contexto. */
export function agregarConsolidado(pessoas: PessoaComercial[], periodoParcial: boolean): Consolidado {
  let realizadoTotal = 0;
  let metaTotal = 0;
  let naoDisponivelCount = 0;
  const contagemStatus: ContagemStatus = { atingido: 0, abaixo_da_meta: 0, sem_preenchimento: 0 };

  for (const pessoa of pessoas) {
    for (const metrica of pessoa.metricas) {
      if (naoDisponivel(metrica, periodoParcial)) {
        naoDisponivelCount += 1;
        continue;
      }
      if (lancada(metrica)) realizadoTotal += metrica.realizado;
      metaTotal += metrica.meta_periodo;
      contagemStatus[metrica.status] += 1;
    }
  }

  const total = contagemStatus.atingido + contagemStatus.abaixo_da_meta + contagemStatus.sem_preenchimento;
  const lancadas = contagemStatus.atingido + contagemStatus.abaixo_da_meta;

  return {
    realizadoTotal,
    metaTotal,
    pctGeral: metaTotal > 0 ? realizadoTotal / metaTotal : null,
    contagemStatus,
    coberturaLancto: total > 0 ? lancadas / total : null,
    naoDisponivelCount,
  };
}

export interface MetricaAgregada {
  metrica: string;
  nomeExibicao: string;
  meta: number;
  realizado: number;
  lancadas: number;
  total: number;
  diasComLacuna: number;
  /** null quando ninguém lançou essa métrica ainda, meta é 0, ou a métrica é naoDisponivel. */
  pct: number | null;
  naoDisponivel: boolean;
}

/** Meta e realizado somados do time inteiro, por métrica — base do gráfico de colunas e da tabela. */
export function agregarPorMetrica(pessoas: PessoaComercial[], periodoParcial: boolean): MetricaAgregada[] {
  const acumulado = new Map<
    string,
    {
      nomeExibicao: string;
      meta: number;
      realizado: number;
      lancadas: number;
      total: number;
      diasComLacuna: number;
      naoDisponivel: boolean;
    }
  >();

  for (const pessoa of pessoas) {
    for (const metrica of pessoa.metricas) {
      const atual = acumulado.get(metrica.metrica) ?? {
        nomeExibicao: metrica.nome_exibicao,
        meta: 0,
        realizado: 0,
        lancadas: 0,
        total: 0,
        diasComLacuna: 0,
        naoDisponivel: naoDisponivel(metrica, periodoParcial),
      };
      atual.total += 1;
      atual.diasComLacuna += metrica.dias_com_lacuna;
      if (!atual.naoDisponivel) {
        if (lancada(metrica)) {
          atual.realizado += metrica.realizado;
          atual.lancadas += 1;
        }
        atual.meta += metrica.meta_periodo;
      }
      acumulado.set(metrica.metrica, atual);
    }
  }

  return Array.from(acumulado.entries()).map(([metrica, v]) => ({
    metrica,
    nomeExibicao: v.nomeExibicao,
    meta: v.meta,
    realizado: v.realizado,
    lancadas: v.lancadas,
    total: v.total,
    diasComLacuna: v.diasComLacuna,
    pct: !v.naoDisponivel && v.lancadas > 0 && v.meta > 0 ? v.realizado / v.meta : null,
    naoDisponivel: v.naoDisponivel,
  }));
}

export interface PessoaAgregada {
  email: string;
  nome: string | null;
  planilhasOrigem: string[];
  lancadas: number;
  atingidas: number;
  total: number;
  realizado: number;
  /** null quando não há métrica considerada (total 0) — cobertura de lançamento, não de metas atingidas. */
  cobertura: number | null;
}

/** Uma linha por pessoa — base do comparativo da tabela. */
export function agregarPorPessoa(pessoas: PessoaComercial[], periodoParcial: boolean): PessoaAgregada[] {
  return pessoas.map((pessoa) => {
    let lancadas = 0;
    let atingidas = 0;
    let total = 0;
    let realizado = 0;

    for (const metrica of pessoa.metricas) {
      if (naoDisponivel(metrica, periodoParcial)) continue;
      total += 1;
      if (lancada(metrica)) {
        lancadas += 1;
        realizado += metrica.realizado;
      }
      if (atingida(metrica)) atingidas += 1;
    }

    return {
      email: pessoa.email,
      nome: pessoa.nome,
      planilhasOrigem: pessoa.planilhas_origem,
      lancadas,
      atingidas,
      total,
      realizado,
      cobertura: total > 0 ? lancadas / total : null,
    };
  });
}

/** Total do time por dia, para uma métrica escolhida — base do gráfico de linha. */
export function serieDoTimePorMetrica(serieDiaria: SerieDiariaDia[], metrica: string): { dia: number; valor: number }[] {
  return serieDiaria.map((d) => ({ dia: d.dia, valor: d.metricas[metrica] ?? 0 }));
}
