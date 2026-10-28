import type { StatusRitmo } from "./ritmo";

/**
 * Faixa de cor do % de atingimento da meta do período, em terços: abaixo de
 * 33,3% vermelho, abaixo de 66,7% amarelo, senão verde. Devolve um
 * `StatusRitmo` para reaproveitar as cores do ProgressBar e do StatusChip.
 * `null` (sem meta) é métrica aberta.
 */
export function statusDoAtingimento(pct: number | null): StatusRitmo {
  if (pct === null) return "sem_meta";
  if (pct < 33.3) return "muito_atras";
  if (pct < 66.7) return "atras";
  return "no_ritmo";
}

/** Classe de cor do texto dos números (Falta/% de atingimento) por faixa. */
export const COR_TEXTO: Record<StatusRitmo, string> = {
  no_ritmo: "text-ok",
  atras: "text-warn",
  muito_atras: "text-bad",
  sem_meta: "text-muted",
};
