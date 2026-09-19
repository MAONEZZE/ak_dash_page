const moedaFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Métricas em R$ na Geral — cards escuros e a coluna Liquidado do Closer na tabela de pessoas. */
export const METRICAS_EM_MOEDA = new Set(["faturamento", "liquidado"]);

const numeroFormatter = new Intl.NumberFormat("pt-BR");

const dataFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatarMoeda(valor: number): string {
  return moedaFormatter.format(valor);
}

export function formatarNumero(valor: number): string {
  return numeroFormatter.format(valor);
}

export function formatarPercentual(parte: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((parte / total) * 100)}%`;
}

export function formatarData(isoDate: string): string {
  // isoDate no formato AAAA-MM-DD — parse manual evita desvio de fuso horário
  const [ano, mes, dia] = isoDate.split("-").map(Number);
  return dataFormatter.format(new Date(ano, mes - 1, dia));
}

const TZ_APP = "America/Sao_Paulo";

const dataHoraEventoFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TZ_APP,
});

const TEM_FUSO_RE = /(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * `event_date` de `SED.events`, exibido em horário de São Paulo.
 *
 * O valor viaja em UTC — é assim que o Prisma grava. A versão anterior fatiava
 * a string e mostrava os dígitos crus, então um evento às 16:00 de São Paulo
 * aparecia como 19:00.
 *
 * O `Z` é acrescentado quando falta: enquanto a coluna for `timestamp` sem
 * fuso, o PostgREST devolve sem marcação nenhuma e o `new Date` interpretaria
 * no fuso do navegador. Com a coluna em `timestamptz` o valor já chega com
 * offset e passa direto — por isso os dois formatos são aceitos.
 */
export function formatarDataHoraEvento(iso: string): string {
  const instante = new Date(TEM_FUSO_RE.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(instante.getTime())) return "";
  const partes = Object.fromEntries(
    dataHoraEventoFormatter.formatToParts(instante).map((p) => [p.type, p.value]),
  );
  return `${partes.day}/${partes.month} · ${partes.hour}:${partes.minute}`;
}

export function formatarHora(data: Date): string {
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Nome a exibir na UI: sempre o nome que vem da API — e-mail só como último recurso, se vier nulo. */
export function nomeExibicao(nome: string | null | undefined, email: string): string {
  return nome ?? email;
}
