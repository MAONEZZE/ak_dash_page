import { METRICAS_CONTA, type ContaFunil, type MetricasConta, type Periodo } from "./tipos-api";

/** Soma as contas (ou só a escolhida). `semConta` (negócios do Pipedrive sem etiqueta de conta) entra só quando a seleção é todas as contas. */
export function somarContas(contas: ContaFunil[], conta: string | null, semConta?: MetricasConta): MetricasConta {
  const selecionadas = contas.some((c) => c.nome === conta) ? contas.filter((c) => c.nome === conta) : contas;
  const soma = Object.fromEntries(METRICAS_CONTA.map((k) => [k, 0])) as MetricasConta;
  for (const c of selecionadas) {
    for (const k of METRICAS_CONTA) soma[k] += c.metricas[k];
  }
  if (semConta && selecionadas === contas) for (const k of METRICAS_CONTA) soma[k] += semConta[k];
  return soma;
}

/** Razão parte ÷ total; `null` quando o total é zero (divisão indefinida). */
export function razao(parte: number, total: number): number | null {
  return total === 0 ? null : parte / total;
}

export const LARGURA_MINIMA_ETAPA = 8;

/** Largura percentual (0–100, 1 casa) de cada etapa proporcional ao maior valor, com piso de `LARGURA_MINIMA_ETAPA`. */
export function largurasEtapas(valores: number[]): number[] {
  const maior = Math.max(0, ...valores);
  if (maior === 0) return valores.map(() => LARGURA_MINIMA_ETAPA);
  return valores.map((valor) => Math.max(LARGURA_MINIMA_ETAPA, Math.round((valor / maior) * 1000) / 10));
}

/** Largura (%) da boca de baixo do funil: a última etapa termina nela. */
const BASE_DO_FUNIL = 34;

/**
 * Larguras [topo, base] (%) de cada etapa num funil de forma fixa: começa em
 * 100% e estreita em passos iguais até `BASE_DO_FUNIL`. A base de uma etapa é o
 * topo da seguinte, então os trapézios encaixam. A forma não depende dos
 * valores: os números e as taxas carregam o dado, e o funil nunca sai invertido.
 */
export function formatoFunil(etapas: number): [number, number][] {
  const passo = (100 - BASE_DO_FUNIL) / etapas;
  const largura = (k: number) => Math.round((100 - k * passo) * 10) / 10;
  return Array.from({ length: etapas }, (_, k) => [largura(k), largura(k + 1)]);
}

/** Índice da menor taxa não nula (primeiro em empate); `null` se houver menos de duas taxas válidas. */
export function indiceGargalo(taxas: (number | null)[]): number | null {
  let indice: number | null = null;
  let menor = Infinity;
  let validas = 0;
  taxas.forEach((taxa, i) => {
    if (taxa === null) return;
    validas++;
    if (taxa < menor) {
      menor = taxa;
      indice = i;
    }
  });
  return validas < 2 ? null : indice;
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

export type ExtremosColuna = Record<string, { melhor: string; pior: string }>;

/** Melhor e pior conta de cada coluna de taxa com ao menos duas taxas válidas e valores distintos. */
export function extremosPorColuna(colunas: ColunaFunil[], linhas: LinhaFunil[]): ExtremosColuna {
  const extremos: ExtremosColuna = {};
  for (const coluna of colunas) {
    if (coluna.tipo !== "taxa") continue;
    const valores = linhas
      .filter((l) => l.valores[coluna.chave] !== null && l.valores[coluna.chave] !== undefined)
      .map((l) => ({ nome: l.nome, valor: l.valores[coluna.chave] as number }));
    if (valores.length < 2) continue;
    const maior = Math.max(...valores.map((v) => v.valor));
    const menor = Math.min(...valores.map((v) => v.valor));
    if (maior === menor) continue;
    extremos[coluna.chave] = {
      melhor: valores.find((v) => v.valor === maior)!.nome,
      pior: valores.find((v) => v.valor === menor)!.nome,
    };
  }
  return extremos;
}

export const COLUNAS_LINKEDIN: ColunaFunil[] = [
  { chave: "conexoes_enviadas", rotulo: "Conexões Enviadas", tipo: "numero" },
  { chave: "aceitacao", rotulo: "% Aceitação", tipo: "taxa" },
  { chave: "conexoes_aceitas", rotulo: "Conexões Aceitas", tipo: "numero" },
  { chave: "abordados", rotulo: "% Abordados", tipo: "taxa" },
  { chave: "mensagens_abordagem", rotulo: "Mensagem de Abordagem", tipo: "numero" },
  { chave: "resposta", rotulo: "% Resposta", tipo: "taxa" },
  { chave: "respondidos", rotulo: "Respondidos", tipo: "numero" },
  { chave: "conversaoNumero", rotulo: "% Conversão em número", tipo: "taxa" },
  { chave: "numeros_captados", rotulo: "Números Captados", tipo: "numero" },
  { chave: "conversaoTotal", rotulo: "Conversão total", tipo: "taxa" },
];

/** Linha da tabela LinkedIn: contadores da conta + taxas calculadas. */
export function linhaLinkedin(nome: string, m: MetricasConta): LinhaFunil {
  const t = taxasLinkedin(m);
  return {
    nome,
    valores: {
      conexoes_enviadas: m.conexoes_enviadas,
      aceitacao: t.aceitacao,
      conexoes_aceitas: m.conexoes_aceitas,
      abordados: t.abordados,
      mensagens_abordagem: m.mensagens_abordagem,
      resposta: t.resposta,
      respondidos: m.respondidos,
      conversaoNumero: t.conversaoNumero,
      numeros_captados: m.numeros_captados,
      conversaoTotal: t.conversaoTotal,
    },
  };
}

export const COLUNAS_INSTAGRAM: ColunaFunil[] = [
  { chave: "abordagens", rotulo: "Abordagens", tipo: "numero" },
  { chave: "resposta", rotulo: "% Resposta", tipo: "taxa" },
  { chave: "respondidos", rotulo: "Respondidos", tipo: "numero" },
  { chave: "conversaoNumero", rotulo: "% Conversão em número", tipo: "taxa" },
  { chave: "numeros_captados", rotulo: "Números Captados", tipo: "numero" },
  { chave: "conversaoTotal", rotulo: "Conversão total", tipo: "taxa" },
];

/** Linha da tabela Instagram: contadores da conta + taxas calculadas. */
export function linhaInstagram(nome: string, m: MetricasConta): LinhaFunil {
  const t = taxasInstagram(m);
  return {
    nome,
    valores: {
      abordagens: m.abordagens,
      resposta: t.resposta,
      respondidos: m.respondidos,
      conversaoNumero: t.conversaoNumero,
      numeros_captados: m.numeros_captados,
      conversaoTotal: t.conversaoTotal,
    },
  };
}

// ---- gráfico de linhas por conta ----

export interface GraficoContas {
  /** Rótulo de cada ponto do eixo X: "dd/mm" por dia, "Jan".."Dez" no ano. */
  rotulos: string[];
  series: { nome: string; valores: number[] }[];
}

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function isoLocal(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

/** Dias "AAAA-MM-DD" de `inicio` a `fim`, inclusive (aritmética em UTC pra não tropeçar no horário de verão). */
function diasEntre(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  for (let d = new Date(`${inicio}T00:00:00Z`); d.toISOString().slice(0, 10) <= fim; d.setUTCDate(d.getUTCDate() + 1)) {
    dias.push(d.toISOString().slice(0, 10));
  }
  return dias;
}

/** "AAAA-MM-DD" `n` dias antes de `dia`. */
function diasAntes(dia: string, n: number): string {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** No filtro de dia o gráfico mostra os 7 dias até ele (a API manda a série desde então): um ponto só não vira linha. */
const DIAS_SERIE_FILTRO_DIA = 7;

/**
 * Uma série por conta com a `metrica` escolhida ao longo do período: um ponto
 * por dia, ou por mês quando a granularidade é ano. Para em hoje, pra o resto
 * do mês corrente não cair a zero; dia sem registro vale 0.
 */
/** Qualquer coisa com nome e série diária: conta de funil ou SDR. */
export interface SerieDiaria<K extends string> {
  nome: string;
  serie: { data: string; metricas: Record<K, number> }[];
}

export function serieGraficoContas<K extends string>(contas: SerieDiaria<K>[], metrica: K, periodo: Periodo, hoje: Date): GraficoContas {
  const fim = periodo.fim < isoLocal(hoje) ? periodo.fim : isoLocal(hoje);
  const inicio = periodo.granularidade === "dia" ? diasAntes(periodo.inicio, DIAS_SERIE_FILTRO_DIA - 1) : periodo.inicio;
  const porMes = periodo.granularidade === "ano";
  const chaves = porMes
    ? [...new Set(diasEntre(inicio, fim).map((d) => d.slice(0, 7)))]
    : diasEntre(inicio, fim);
  const rotulos = porMes
    ? chaves.map((k) => MESES_CURTOS[Number(k.slice(5, 7)) - 1])
    : chaves.map((k) => `${k.slice(8, 10)}/${k.slice(5, 7)}`);

  const series = contas.map((c) => {
    const somas = new Map<string, number>();
    for (const dia of c.serie) {
      const chave = porMes ? dia.data.slice(0, 7) : dia.data;
      somas.set(chave, (somas.get(chave) ?? 0) + dia.metricas[metrica]);
    }
    return { nome: c.nome, valores: chaves.map((k) => somas.get(k) ?? 0) };
  });

  return { rotulos, series };
}

/** Marcas do eixo Y de metade em metade do maior valor: [0, total/2, total], com total par (mínimo 2). */
export function escalaMetades(valores: number[]): [number, number, number] {
  const maior = Math.max(0, ...valores);
  const total = Math.max(2, Math.ceil(maior / 2) * 2);
  return [0, total / 2, total];
}
