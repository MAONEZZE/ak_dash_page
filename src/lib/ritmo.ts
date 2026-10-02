import type { DiasUteis } from "./tipos-api";

/**
 * Ritmo da meta: onde a métrica deveria estar hoje, dado quantos dias úteis do
 * período já passaram. Os dias úteis vêm prontos do BFF (`dias_uteis`, seg–sex,
 * sem feriado — o mesmo calendário que multiplica a meta diária), então a
 * meta e o "esperado hoje" nunca divergem.
 */
export type StatusRitmo = "no_ritmo" | "atras" | "muito_atras" | "sem_meta";

export interface Ritmo {
  status: StatusRitmo;
  /** 0–1: fração do período já decorrida — é onde fica o marcador da barra. */
  esperadoFrac: number;
  esperadoHoje: number;
  mediaPorDiaUtil: number;
  /** `null` sem meta ou antes do primeiro dia útil (não há média pra projetar). */
  projecao: number | null;
  necessarioPorDiaUtil: number;
  diasRestantes: number;
}

export function calcularRitmo(realizado: number, meta: number | null, dias: DiasUteis): Ritmo {
  const { decorridos, total } = dias;
  const esperadoFrac = total > 0 ? Math.min(decorridos / total, 1) : 0;
  const diasRestantes = Math.max(total - decorridos, 0);
  const mediaPorDiaUtil = decorridos > 0 ? realizado / decorridos : 0;

  if (!meta) {
    return { status: "sem_meta", esperadoFrac, esperadoHoje: 0, mediaPorDiaUtil, projecao: null, necessarioPorDiaUtil: 0, diasRestantes };
  }

  const falta = Math.max(meta - realizado, 0);
  // Último dia útil (ou período encerrado): o que falta é pra hoje, não "por dia".
  const necessarioPorDiaUtil = falta / Math.max(diasRestantes, 1);
  const projecao = decorridos > 0 ? (realizado * total) / decorridos : null;

  let status: StatusRitmo = "no_ritmo";
  if (esperadoFrac > 0) {
    const ratio = realizado / meta / esperadoFrac;
    status = ratio >= 1 ? "no_ritmo" : ratio >= 0.8 ? "atras" : "muito_atras";
  }

  return { status, esperadoFrac, esperadoHoje: meta * esperadoFrac, mediaPorDiaUtil, projecao, necessarioPorDiaUtil, diasRestantes };
}
