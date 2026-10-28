import { formatarNumero } from "../lib/formato";
import type { StatusRitmo } from "../lib/ritmo";

const COR_PREENCHIMENTO: Record<StatusRitmo, string> = {
  no_ritmo: "bg-ok",
  atras: "bg-warn-bar",
  muito_atras: "bg-bad",
  sem_meta: "bg-aberta",
};

interface ProgressBarProps {
  valor: number;
  meta: number;
  status: StatusRitmo;
  /** Classe de altura do trilho (padrão 8px; tabelas e cards da Time usam a fina). */
  altura?: string;
}

/**
 * Barra de progresso da meta. Meta 0 (ou sem meta) é métrica "aberta" pra pessoa: barra cheia em azul.
 */
export function ProgressBar({ valor, meta, status, altura = "h-2" }: ProgressBarProps) {
  const largura = meta > 0 ? Math.min(Math.max(valor / meta, 0), 1) * 100 : 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={meta}
      aria-label={`${formatarNumero(valor)} de ${formatarNumero(meta)}`}
      className={`relative w-full rounded-full bg-track ${altura}`}
    >
      <div className={`barra-preenchimento h-full rounded-full ${COR_PREENCHIMENTO[status]}`} style={{ width: `${largura}%` }} />
    </div>
  );
}
