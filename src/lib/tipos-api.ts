/**
 * Contrato BFF (ak_dash) <-> Frontend (ak_dash_page).
 * Espelha openapi.yaml — qualquer mudança de campo precisa mudar os dois.
 * Fonte única de dado: Supabase (dash.vw_metricas, dash.metricas_metas,
 * dash.metricas_faturamento, dash.cliente_faturamento, dash.users). Escopo:
 * /pessoas, /comercial/sdr, /comercial/closer, /geral, /financeiro. Os
 * demais KPIs da página Financeiro (inadimplência, margem, despesas,
 * EBITDA, contas a receber/pagar) seguem pendentes (ver ak_dash/README.md).
 */

export type Granularidade = "dia" | "semana" | "mes" | "ano";
export type Cargo = "sdr" | "closer";

export interface Erro {
  erro: {
    codigo: string;
    mensagem: string;
  };
}

export interface Pessoa {
  id: string;
  nome: string;
  cargo: Cargo;
  email: string;
  imagem_url: string | null;
}

export interface Periodo {
  granularidade: Granularidade;
  inicio: string; // AAAA-MM-DD
  fim: string; // AAAA-MM-DD
}

/** Formato do parâmetro `periodo` por granularidade: dia `AAAA-MM-DD`, semana `AAAA-Wnn` (ISO, segunda a domingo), mês `AAAA-MM`, ano `AAAA`. */

export type StatusMetrica = "atingido" | "abaixo_da_meta" | "sem_preenchimento" | "sem_meta";

export interface Metrica {
  metrica: string; // nome da coluna de origem, o mesmo dos dois lados: ex. "numeros_captados", "ligacoes_agendadas"
  nome_exibicao: string;
  /** Meta do cargo já multiplicada pelos dias úteis do período (no banco ela é DIÁRIA por pessoa): dia = a diária, semana = 5×, mês de 22 dias úteis = 22×. `null` = sem meta cadastrada, nunca 0. */
  meta_periodo: number | null;
  realizado: number;
  status: StatusMetrica;
  dias_com_lacuna: number;
}

export interface MetasAtingidas {
  atingidas: number;
  total: number;
}

export interface PessoaComercial {
  id_user: string;
  email: string;
  nome: string | null;
  imagem_url: string | null;
  metas_atingidas: MetasAtingidas;
  metricas: Metrica[];
  /**
   * `Σ(realizado/meta × 100) / qtd_metricas`, escala 0-100+, SEM cap,
   * contra a meta cheia do período. `null` quando QUALQUER métrica do cargo
   * não tem meta cadastrada — nunca uma média parcial disfarçada de total.
   */
  pontuacao_total: number | null;
  /**
   * Dense rank (1-based) de pontuacao_total decrescente, dentro do mesmo
   * pool (SDR só compete com SDR, Closer só com Closer). Empate = mesma
   * posição, sem pular número. `null` junto com `pontuacao_total: null`.
   */
  posicao: number | null;
  /** Contas (vw_metricas.conta) que contribuíram pra essa pessoa no período. */
  contas_origem: string[];
}

export interface SerieDiariaDia {
  dia: string; // AAAA-MM-DD
  metricas: Record<string, number>; // chave da métrica -> soma do TIME INTEIRO naquele dia
}

export interface RespostaComercial {
  periodo: Periodo;
  periodo_parcial: boolean;
  avisos: string[];
  pessoas: PessoaComercial[];
  serie_diaria: SerieDiariaDia[];
}

/** Chaves das 9 métricas de cargo SDR. `reunioes_agendadas` e `indicacoes` aparecem nos dois cargos (SDR e Closer agendam reunião e trabalham indicação), cada um com a sua meta. */
export const METRICAS_SDR = [
  "conexoes_enviadas",
  "conexoes_aceitas",
  "abordagens",
  "in_mails",
  "fups",
  "numeros_captados",
  "ligacoes_agendadas",
  "reunioes_agendadas",
  "indicacoes",
] as const;
export type MetricaSdr = (typeof METRICAS_SDR)[number];

/** Chaves das 4 métricas de cargo Closer. */
export const METRICAS_CLOSER = ["ligacoes_realizadas", "reunioes_agendadas", "reunioes_realizadas", "indicacoes"] as const;
export type MetricaCloser = (typeof METRICAS_CLOSER)[number];

/** Parâmetros de query aceitos por /comercial/sdr e /comercial/closer. */
export interface ParametrosComercial {
  granularidade: Granularidade;
  periodo: string; // formato depende de granularidade — ver openapi.yaml
  pessoas?: string[]; // emails; ausente/vazio = todas as pessoas ativas do cargo
}

// ---- /geral ----

export interface DiasUteis {
  decorridos: number;
  total: number;
}

export interface CardGeral {
  metrica: string;
  nome_exibicao: string;
  /** true pros cards de faturamento (linha 1, variante escura). Inscritos/Aprovados ficam na mesma linha mas vêm de `eventos`, não daqui. */
  escuro: boolean;
  realizado: number | null;
  /** Meta da empresa: a do cargo × pessoas ativas do cargo, somada sobre os cargos do card (reuniões agendadas e indicações somam SDR + Closer). `null` se faltar meta em alguma parte. */
  meta: number | null;
  pct: number | null;
  pct_ritmo: number | null;
}

export interface MetricaPessoaGeral {
  metrica: string;
  nome_exibicao: string;
  realizado: number | null;
  meta: number | null;
}

export interface PessoaGeral {
  id_user: number;
  nome: string;
  cargo: Cargo;
  /** nome, ou "{nome} ({SDR|Closer})" quando duas pessoas ativas têm o mesmo nome — calculado no BFF. */
  rotulo: string;
  imagem_url: string | null;
  pontuacao: number | null;
  posicao: number | null;
  /** Colunas da tabela pro cargo — ver docs/plans/migracao-banco-pagina-geral.md. */
  metricas: MetricaPessoaGeral[];
}

/** Um dos próximos eventos de `SED.events` — alimenta os cards de Inscritos e Aprovados, que giram entre eles. */
export interface EventoGeral {
  id: string;
  titulo: string;
  /** `events.event_date` cru: timestamp SEM fuso, já em horário de São Paulo — formatar sem converter fuso. */
  data: string;
  /** `null` = evento sem limite cadastrado. */
  capacidade: number | null;
  /** TODAS as inscrições do evento, qualquer status — recusadas incluídas. */
  inscritos: number;
  /** Subconjunto de `inscritos` — só `approved`. */
  aprovados: number;
}

export interface RespostaGeral {
  periodo: Periodo;
  dias_uteis: DiasUteis;
  cards: CardGeral[];
  /** Até 3, em data crescente. Ignora o período da página (são eventos futuros). Vazio = sem evento futuro. */
  eventos: EventoGeral[];
  pessoas: PessoaGeral[];
  avisos: string[];
}

export interface ParametrosGeral {
  granularidade?: Granularidade; // padrão "mes"
  periodo?: string; // "atual" (padrão) ou formato de acordo com granularidade — ver openapi.yaml
}

// ---- /financeiro ----

export interface CardFinanceiro {
  metrica: string;
  nome_exibicao: string;
  /** Soma de valor_bruto_contrato (faturamento) ou liquido_entrada (liquidado) das vendas do período — 0, nunca null, sem venda. Sem meta: card mais simples que CardGeral. */
  realizado: number;
}

export interface VendaFinanceiro {
  id: number;
  /** metricas_faturamento.data_venda cru (ex. "2026-01-26T00:00:00") — cortar os 10 primeiros caracteres antes de formatarData. */
  data_venda: string;
  /** cliente_faturamento.nome via id_cliente; null sem id_cliente ou sem cliente correspondente. */
  cliente: string | null;
  produto: string | null;
  canal: string | null;
  metodo_pagamento: string | null;
  num_parcelas: number | null;
  valor_bruto_contrato: number;
  /** Valor efetivamente pago pelo cliente (bruto de imposto/taxa) — "Pago". */
  valor_entrada: number;
  /** liquido_entrada = valor_entrada × (1 − imposto) × (1 − taxa). */
  liquido_entrada: number;
  /** Percentual decimal (ex. 0.1 = 10%). */
  imposto: number;
  /** Percentual decimal da maquininha; 0 em boa parte das vendas. */
  taxa: number;
  /** Bruto do SEGUNDO pagamento da venda (ex. entrada no PIX + resto no cartão) — 0 sem segundo pagamento. */
  valor_pgto_2: number;
  /** Percentual decimal da maquininha do segundo pagamento — mesmo `imposto` da venda se aplica aos dois. 0 sem segundo pagamento. */
  taxa_pgto_2: number;
  /** Líquido do segundo pagamento — soma com liquido_entrada pro líquido total da venda. 0 sem segundo pagamento. */
  liquido_pgto_2: number;
  /** Forma de pagamento do segundo pagamento — pode diferir de metodo_pagamento. null sem segundo pagamento. Entra como linha própria em "Como entrou o dinheiro" (agrupa por forma, não por venda). */
  forma_pgto_2: string | null;
  /** FK dash.users.id do closer. Agrupar por ESTE campo, não por `closer` — dois ids podem compartilhar o mesmo nome (ex. dois "Jonathan" cadastrados). */
  user_closer: number | null;
  /** dash.users.nome via user_closer — inclui closer inativo (saiu do time mas vendeu no período); null sem user_closer ou sem correspondente. */
  closer: string | null;
}

export interface RespostaFinanceiro {
  periodo: Periodo;
  cards: CardFinanceiro[];
  /** Ordenadas por data_venda decrescente (venda mais recente primeiro). */
  vendas: VendaFinanceiro[];
}
