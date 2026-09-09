/**
 * Contrato BFF (ak_dash) <-> Frontend (ak_dash_page).
 * Espelha openapi.yaml — qualquer mudança de campo precisa mudar os dois.
 * Escopo: /pessoas, /comercial/sdr, /comercial/closer.
 * Financeiro e imersão ficam pendentes (ver README.md).
 */

export type Granularidade = "dia" | "mes" | "ano";

export interface Erro {
  erro: {
    codigo: string;
    mensagem: string;
  };
}

export interface Pessoa {
  id: string;
  nome: string;
  cargo: string;
  email: string;
}

export interface Periodo {
  granularidade: Granularidade;
  inicio: string; // AAAA-MM-DD
  fim: string; // AAAA-MM-DD
}

export type StatusMetrica = "atingido" | "abaixo_da_meta" | "sem_preenchimento";

export interface Metrica {
  metrica: string; // chave estável snake_case, ex. "conexoes_enviadas"
  nome_exibicao: string;
  meta_periodo: number;
  realizado: number;
  status: StatusMetrica;
  dias_com_lacuna: number;
}

export interface MetasAtingidas {
  atingidas: number;
  total: number;
}

export interface PessoaComercial {
  email: string;
  nome: string | null;
  metas_atingidas: MetasAtingidas;
  metricas: Metrica[];
  /**
   * Gamificação — sem persistência nova, recalculado do zero a cada
   * requisição em cima do período filtrado. Regra fixa: 1 ponto por dia,
   * por métrica, em que o valor realizado do dia bateu ou superou a meta
   * diária daquela coluna, somado por pessoa no período filtrado. Lacuna
   * (célula vazia) não pontua e não penaliza; "0" preenchido também não
   * pontua mas não é lacuna. Pessoa em mais de uma planilha: pontos
   * somados de todas.
   */
  pontuacao_total: number;
  /**
   * Gamificação — dense rank (1-based) de pontuacao_total decrescente,
   * dentro do mesmo pool (SDR só compete com SDR, Closer só com Closer —
   * nunca misture os dois conjuntos de métricas num ranking só). Empate =
   * mesma posição, sem pular número.
   */
  posicao: number;
  planilhas_origem: string[];
}

export interface SerieDiariaDia {
  dia: number; // dia do mês (1-31)
  metricas: Record<string, number>; // chave da métrica -> soma do TIME INTEIRO naquele dia
}

export interface RespostaComercial {
  periodo: Periodo;
  periodo_parcial: boolean;
  avisos: string[];
  pessoas: PessoaComercial[];
  /**
   * Evolução diária agregada do time (não por pessoa) — só cobre a fatia do
   * mês corrente do período pedido; vazia quando o período é inteiramente
   * histórico.
   */
  serie_diaria: SerieDiariaDia[];
}

/** Chaves das 8 métricas de função SDR — para tipar colunas de tabela sem "magic string". */
export const METRICAS_SDR = [
  "conexoes_enviadas",
  "conexoes_aceitas",
  "abordagens",
  "inmails_enviados",
  "follow_ups",
  "numeros_captados",
  "ligacoes_agendadas",
  "indicacoes_captadas",
] as const;
export type MetricaSdr = (typeof METRICAS_SDR)[number];

/** Chaves das 4 métricas de função Closer. */
export const METRICAS_CLOSER = [
  "ligacoes_realizadas",
  "reunioes_agendadas",
  "reunioes_realizadas",
  "indicacoes",
] as const;
export type MetricaCloser = (typeof METRICAS_CLOSER)[number];

/**
 * Métricas sem coluna equivalente em `dash.metricas` — sem dado histórico
 * algum em mês fechado (ver `ak_dash/app/dominios/comercial/banco.py:28-40`,
 * `_COLUNA_DB_POR_METRICA`). Front marca como "não disponível" nesse caso em
 * vez de exibir como se fosse uma lacuna comum de preenchimento.
 */
export const METRICAS_SEM_HISTORICO = new Set<string>(["indicacoes_captadas"]);

/** Parâmetros de query aceitos por /comercial/sdr e /comercial/closer. */
export interface ParametrosComercial {
  granularidade: Granularidade;
  periodo: string; // formato depende de granularidade — ver openapi.yaml
  pessoas?: string[]; // emails; ausente/vazio = todas as pessoas ativas
}
