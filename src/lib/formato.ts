const moedaFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

/** `event_date` de `SED.events`: "AAAA-MM-DDTHH:MM:SS" sem fuso, já em horário de São Paulo. Parse manual — `new Date(iso)` trataria como UTC e voltaria 3h. */
export function formatarDataHoraEvento(iso: string): string {
  const [data, hora = ""] = iso.split("T");
  const [, mes, dia] = data.split("-");
  const hhmm = hora.slice(0, 5);
  return hhmm ? `${dia}/${mes} · ${hhmm}` : `${dia}/${mes}`;
}

export function formatarHora(data: Date): string {
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Nome a exibir na UI: sempre o nome que vem da API — e-mail só como último recurso, se vier nulo. */
export function nomeExibicao(nome: string | null | undefined, email: string): string {
  return nome ?? email;
}
