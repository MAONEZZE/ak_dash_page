/**
 * Contrato BFF (ak_dash) <-> Frontend (ak_dash_page).
 * Espelha openapi.yaml — qualquer mudança de campo precisa mudar os dois.
 * Fonte única de dado: Supabase (dash2.vw_metricas, dash2.metas,
 * dash2.users/dash2.user_cargos, notas_financeiro). Escopo:
 * /pessoas, /comercial/seller, /comercial/sdr, /comercial/closer, /geral, /financeiro. Os
 * demais KPIs da página Financeiro (inadimplência, margem, despesas,
 * EBITDA, contas a receber/pagar) seguem pendentes (ver ak_dash/README.md).
 */

export type Granularidade = "dia" | "semana" | "mes" | "ano" | "custom";
export type Cargo = "seller" | "sdr" | "closer";

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
  email: string | null;
  imagem_url: string | null;
}

export interface Periodo {
  granularidade: Granularidade;
  inicio: string; // AAAA-MM-DD
  fim: string; // AAAA-MM-DD
}

/** Formato do parâmetro `periodo` por granularidade: dia `AAAA-MM-DD`, semana `AAAA-Wnn` (ISO, segunda a domingo), mês `AAAA-MM`, ano `AAAA`, custom `AAAA-MM-DD..AAAA-MM-DD`. */

export type StatusMetrica = "atingido" | "abaixo_da_meta" | "sem_preenchimento" | "sem_meta";

/** Indicadores da aba Dashboard das planilhas, calculados pelo BFF. `null` = sem meta (ou fora da granularidade). */
export interface FaltaFolga {
  tipo: "falta" | "folga";
  valor: number;
}

export interface MediaNecessaria {
  /** `null` quando a situação não é "pendente". */
  valor: number | null;
  unidade: "hora" | "dia";
  situacao: "pendente" | "meta_batida" | "expediente_encerrado" | "periodo_encerrado";
}

export interface Indicadores {
  pct_atingimento: number | null;
  falta_folga: FaltaFolga | null;
  /** Só na granularidade dia. */
  horas_restantes: number | null;
  media_necessaria: MediaNecessaria | null;
  /** Só na granularidade mes: realizado ÷ dias úteis decorridos × 22. */
  previsao: number | null;
}

/** Uma métrica do time inteiro do cargo: realizado de todos, meta = soma de quem tem meta. */
export interface MetricaTime extends Indicadores {
  metrica: string;
  nome_exibicao: string;
  meta_periodo: number | null;
  realizado: number;
}

export interface Metrica extends Indicadores {
  metrica: string; // nome da coluna de origem, o mesmo dos dois lados: ex. "numeros_captados", "ligacoes_realizadas"
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
  email: string | null;
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
  /** Mesmo cálculo e formato do `dias_uteis` de /geral. */
  dias_uteis: DiasUteis;
  periodo_parcial: boolean;
  avisos: string[];
  pessoas: PessoaComercial[];
  metricas_time: MetricaTime[];
  serie_diaria: SerieDiariaDia[];
}

/**
 * Chaves das 10 métricas de cargo SDR: as 4 do Dripify (`conexoes_enviadas`
 * a `in_mails`) + as 6 lançadas pelo SDR. `ligacoes_realizadas`,
 * `reunioes_agendadas`, `indicacoes` e `inscricoes_realizadas` aparecem nos
 * dois cargos, cada um com a sua meta. `ligacoes_agendadas` é só do Closer.
 */
export const METRICAS_SDR = [
  "conexoes_enviadas",
  "conexoes_aceitas",
  "abordagens",
  "in_mails",
  "fups",
  "numeros_captados",
  "inscricoes_realizadas",
  "ligacoes_realizadas",
  "indicacoes",
  "reunioes_agendadas",
] as const;
export type MetricaSdr = (typeof METRICAS_SDR)[number];

/** Chaves das 6 métricas de cargo Closer. */
export const METRICAS_CLOSER = [
  "ligacoes_agendadas",
  "ligacoes_realizadas",
  "reunioes_agendadas",
  "reunioes_realizadas",
  "indicacoes",
  "inscricoes_realizadas",
] as const;
export type MetricaCloser = (typeof METRICAS_CLOSER)[number];

/**
 * Métricas que a aba "Dashboard" de cada planilha (Sellers, SDRs, Closers)
 * acompanha, na ordem dela — é o que a Time mostra por cargo.
 * "Onboarding realizado" (Dashboard Closers) ainda não existe no banco.
 */
export const METRICAS_DASHBOARD: Record<Cargo, readonly string[]> = {
  seller: ["fups", "numeros_captados", "indicacoes"],
  sdr: ["inscricoes_realizadas", "indicacoes", "reunioes_agendadas"],
  closer: ["reunioes_agendadas", "reunioes_realizadas", "indicacoes", "inscricoes_realizadas"],
};

/** Parâmetros de query aceitos por /comercial/{seller,sdr,closer}. */
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
  /** true pros cards de faturamento (linha 1, variante escura). */
  escuro: boolean;
  realizado: number | null;
  /** Meta da empresa: soma das metas das pessoas ativas que compõem o card. `null` se ninguém da composição tem meta. */
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
  /**
   * Colunas da tabela pro cargo — Seller: fups, numeros_captados, indicacoes;
   * SDR: numeros_captados, ligacoes_realizadas,
   * reunioes_agendadas, indicacoes, inscricoes_realizadas; Closer:
   * reunioes_realizadas, liquidado, reunioes_agendadas, indicacoes,
   * inscricoes_realizadas.
   */
  metricas: MetricaPessoaGeral[];
}

/** Um dos próximos eventos de `SED.events` — linha das tabelas de eventos da Geral. */
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
  /** Subconjunto de `inscritos` — só `pending`. */
  pendentes: number;
  /** Subconjunto de `inscritos` — só `rejected`. */
  rejeitados: number;
}

/** Uma linha da aba Logs da planilha `PLANILHA_LOGS_ID` (`dash2.logs_pipedrive`). */
export interface LogAtividade {
  /** YYYY-MM-DD */
  data: string;
  /** HH:MM:SS */
  hora: string | null;
  /** "Usuario da ação" */
  usuario: string | null;
  /** "Atividade feita" */
  atividade: string;
  /** "Nome do Cliente" */
  cliente: string | null;
}

/** Liquidado do período pedido contra R$ 380 mil × meses que o período toca. SEGUE o filtro de data. */
export interface Termometro {
  realizado: number;
  meta: number;
}

export interface RespostaGeral {
  periodo: Periodo;
  dias_uteis: DiasUteis;
  /**
   * Escuros: faturamento, liquidado (sempre do mês). Claros: reunioes_agendadas,
   * ligacoes_realizadas, inscricoes_realizadas, oportunidade.
   */
  cards: CardGeral[];
  /** Confrarias do mês corrente (até 10), em data crescente. Ignora o período da página. */
  eventos: EventoGeral[];
  /** Os 10 logs mais recentes, do mais novo pro mais antigo. SEGUE o período da página. */
  logs: LogAtividade[];
  pessoas: PessoaGeral[];
  termometro: Termometro | null;
  /** Inclui `fonte_indisponivel:<tabela>` quando uma consulta ao banco falhou. */
  avisos: string[];
}

export interface ParametrosGeral {
  granularidade?: Granularidade; // padrão "mes"
  periodo?: string; // "atual" (padrão) ou formato de acordo com granularidade — ver openapi.yaml
}

// ---- /financeiro ----

/** Uma linha de uma aba "NFS <mês>" da planilha do financeiro (tabela notas_financeiro). */
export interface NotaFinanceiro {
  /** "AAAA-MM:<nº da linha na aba>" */
  chave: string;
  /** AAAA-MM da aba — a receita líquida (valor_pago) cai neste mês. */
  mes: string;
  /** AAAA-MM-DD: Data de Venda válida, senão dia 1 do mês da aba — faturamento e nº de vendas caem aqui. */
  data_referencia: string;
  cliente: string | null;
  categoria: "venda nova" | "mensalidade cliente" | "upsell" | null;
  /** "Ativação" | "Tração" | "Aceleração" | "The Green House", ou o texto cru da planilha. */
  produto: string | null;
  /** Receita líquida (coluna "Valor pago"); 0 quando vazia. */
  valor_pago: number;
  /** Faturamento (coluna "Valor da venda"); 0 quando vazia. */
  valor_venda: number;
  forma_pagamento: "PIX" | "Cartão" | "Boleto" | "Outros";
  /** Coluna "Origem do lead"; null quando vazia. */
  canal: string | null;
}

export interface RespostaFinanceiro {
  periodo: Periodo;
  avisos?: string[];
  /** Notas do ano pedido, por data_referencia decrescente. */
  notas: NotaFinanceiro[];
}

// ---- /funil/{canal} ----

export type Canal = "linkedin" | "instagram";

export const METRICAS_CONTA = [
  "conexoes_enviadas",
  "conexoes_aceitas",
  "mensagens_abordagem",
  "abordagens",
  "follows_abordagem",
  "respondidos",
  "in_mails",
  "fups",
  "numeros_captados",
  "indicacoes",
] as const;
export type MetricaConta = (typeof METRICAS_CONTA)[number];

export type MetricasConta = Record<MetricaConta, number>;

/** Métricas de uma conta num dia com registro (vazio vira 0). */
export interface DiaContaFunil {
  data: string; // YYYY-MM-DD
  metricas: MetricasConta;
}

export interface ContaFunil {
  id_conta: string;
  nome: string;
  metricas: MetricasConta;
  /** Um item por dia com registro no período, em ordem de data. */
  serie: DiaContaFunil[];
}

export interface RespostaFunil {
  periodo: Periodo;
  avisos: string[];
  contas: ContaFunil[];
  /** Métricas do Pipedrive de negócios sem etiqueta de conta: só entram no consolidado. */
  sem_conta: MetricasConta;
  /** Meta de números captados no período (sellers ligados às contas); null sem seller ou sem meta. */
  meta_numeros_captados: number | null;
}

export interface ParametrosFunil {
  granularidade: Granularidade;
  periodo: string;
}

// ---- /funil-sdr ----

export const METRICAS_SDR_FUNIL = [
  "abordagens",
  "respondidos",
  "inscricoes_realizadas",
  "indicacoes",
  "reunioes_agendadas",
] as const;
export type MetricaSdrFunil = (typeof METRICAS_SDR_FUNIL)[number];

export type MetricasSdrFunil = Record<MetricaSdrFunil, number>;

export interface SdrFunil {
  id_user: string;
  nome: string;
  imagem_url: string | null;
  metricas: MetricasSdrFunil;
  /** Meta de inscrições do SDR no período: a parte dele na meta do time, na proporção da meta diária. `null` sem diária cadastrada. */
  meta_inscricoes: number | null;
  /** Um item por dia com registro no período, em ordem de data. */
  serie: { data: string; metricas: MetricasSdrFunil }[];
}

/** Funil do time de SDR. oportunidades = numeros_captados (LinkedIn + Instagram) + indicacoes (SDRs). */
export interface EtapasFunilSdr {
  numeros_captados: number;
  indicacoes: number;
  oportunidades: number;
  abordados: number;
  respondidos: number;
  inscritos: number;
}

export interface RespostaFunilSdr {
  periodo: Periodo;
  dias_uteis: DiasUteis;
  avisos: string[];
  /** Inscrições realizadas, Indicações captadas e Reuniões agendadas (aba Dashboard SDR). Meta: dia = soma das diárias; semana/mês = metas editáveis da aba; ano/custom = diárias × dias úteis. Na página só Reuniões agendadas vira card. */
  metricas_time: MetricaTime[];
  funil: EtapasFunilSdr;
  sdrs: SdrFunil[];
  /** Evento escolhido no filtro ou, sem escolha, o próximo de qualquer título (SED.events, fora do filtro de período): fonte do velocímetro e dos cards do evento. `null` sem nenhuma. */
  evento: EventoVelocimetro | null;
}

/** Opção do filtro de evento (header, só na página Funil SDR). */
export interface OpcaoEvento {
  id: string;
  titulo: string;
  /** `event_date` cru, em UTC — formatar com `formatarDataHoraEvento`. */
  data: string;
}

export interface RespostaEventosFunilSdr {
  eventos: OpcaoEvento[];
  avisos: string[];
}

export interface EventoFunilEvento {
  id: string;
  titulo: string;
  /** `event_date` cru, em UTC — formatar com `formatarDataHoraEvento`. */
  data: string | null;
  /** Todas as inscrições do evento, qualquer status. */
  total: number;
  aprovados: number;
  pendentes: number;
  rejeitados: number;
  /** Negócios hoje em Onboarding realizado com a etiqueta do evento e Almoço pago (198 ou 199). */
  almocos_pagos: number;
}

/** Etapas do Funil Evento: retrato de agora do pipeline akeel 2.0, negócios com a etiqueta do evento. inscritos = coluna "3. Inscrito"; comparecimento vem do SED. */
export interface EtapasFunilEvento {
  inscritos: number;
  onboarding_agendado: number;
  onboarding_realizado: number;
  comparecimento: number;
  vendas: number;
}

export interface RespostaFunilEvento {
  periodo: Periodo;
  avisos: string[];
  /** `null` quando não há Imersão (nem escolhida, nem agendada). */
  evento: EventoFunilEvento | null;
  funil: EtapasFunilEvento;
}

export interface EventoVelocimetro {
  id: string;
  titulo: string;
  /** `event_date` cru, em UTC — formatar com `formatarDataHoraEvento`. */
  data: string;
  /** Aprovados + pendentes (recusados fora) — diferente dos inscritos da Geral, que contam todo status. */
  inscritos: number;
  /** Os mesmos `inscritos`, só os feitos (`created_at`) dentro do filtro de data — valor do velocímetro. */
  inscritos_periodo: number;
  /** Contagem por status (`approved`, `pending`, `rejected`). */
  aprovados: number;
  pendentes: number;
  rejeitados: number;
  /** Negócios hoje na coluna Onboarding realizado com a etiqueta do evento e Almoço pago (198 ou 199). */
  almocos_pagos: number;
  /** `null` = evento sem limite cadastrado. */
  capacidade: number | null;
  /** Meta do velocímetro no filtro atual. Dia: (capacidade − inscritos até ontem) ÷ dias até a véspera do evento
   * sem domingos, para cima. Semana: diária × 6, limitada ao que falta. Mês, ano e custom: a capacidade.
   * 0 = capacidade atingida; `null` = sem capacidade ou, no dia/semana, do dia do evento em diante. */
  meta_velocimetro: number | null;
}

// ---- /sdr ----

/** Um dia da janela do evento (1ª inscrição → véspera, sem domingo). */
export interface PontoSerieSdr {
  data: string;
  /** Inscrições acumuladas desde o início da janela; `null` em dia futuro. */
  acumulado: number | null;
  /** Acumulado até o dia anterior + meta diária; `null` sem meta diária. */
  ritmo: number | null;
}

export interface PrevisaoSdr {
  /** Inscrições projetadas até a véspera do evento pela média dos dias decorridos. */
  valor: number;
  /** Meta diária × dias da janela; `null` sem meta diária. */
  meta: number | null;
  pct_meta: number | null;
}

export interface SdrPaginaSdr {
  id_user: string;
  nome: string;
  imagem_url: string | null;
  /** Inscrições no período do filtro. */
  inscricoes: number;
  meta_inscricoes: number | null;
  /** Ligações realizadas no período do filtro (metricas_sdrs). */
  ligacoes: number;
  /** ligacoes × 8 + inscricoes × 10. */
  pontuacao: number;
  posicao: number;
  meta_diaria: number | null;
  previsao: PrevisaoSdr | null;
  serie_evento: PontoSerieSdr[];
  /** Card "Ranking SDR", no mês `mes_ranking`. */
  ranking_mes: RankingMesSdr;
}

export interface RankingMesSdr {
  /** Inscrições do SDR no mês (planilha → metricas_funil_sdr). */
  inscricoes: number;
  /** Desses, as da linha de hoje. */
  inscricoes_hoje: number;
  /** Meta diária do SDR (planilha) × dias seg–sex de `janela_meta`; `null` sem meta diária ou sem janela. */
  meta: number | null;
}

export interface EventoPaginaSdr {
  id: string;
  titulo: string;
  data: string;
  capacidade: number | null;
}

export interface RespostaPaginaSdr {
  periodo: Periodo;
  avisos: string[];
  evento: EventoPaginaSdr | null;
  /** `null` sem evento ou sem inscrição antes da véspera. */
  janela: { inicio: string; fim: string } | null;
  /** Mês do card "Ranking SDR" (o que contém o fim do filtro). */
  mes_ranking: { inicio: string; fim: string } | null;
  /** Janela da meta do ranking: do início do evento até a véspera (no máximo o fim do mês); `null` se o evento é antes do mês. */
  janela_meta: { inicio: string; fim: string } | null;
  /** Inscritos (approved/pending) do evento no SED na janela da meta (início do evento → véspera); `null` sem evento. */
  inscritos_sed_mes: number | null;
  /** Em ordem de posição do ranking. */
  sdrs: SdrPaginaSdr[];
}

// ---- /seller ----
export interface SellerPaginaSeller {
  id_user: string;
  nome: string;
  imagem_url: string | null;
  /** Números captados no mês: contas dos funis ligadas ao seller + o sem_conta do canal em que ele é o único seller. */
  numeros_captados: number;
  /** Desses, os de hoje (só os com perfil: o sem_conta não tem série). */
  numeros_captados_hoje: number;
  /** Meta do mês inteiro (diária × 22, a mesma do velocímetro dos funis); `null` sem meta. */
  meta: number | null;
}
export interface RespostaPaginaSeller {
  periodo: Periodo;
  avisos: string[];
  /** Sellers ativos, por id. */
  sellers: SellerPaginaSeller[];
}
