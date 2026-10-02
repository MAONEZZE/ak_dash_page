import { formatarNumero } from "../lib/formato";
import type { StatusRitmo } from "../lib/ritmo";

const COR_PREENCHIMENTO: Record<StatusRitmo, string> = {
  no_ritmo: "bg-ok",
  atras: "bg-warn-bar",
  muito_atras: "bg-bad",
  sem_meta: "bg-faint",
};

interface ProgressBarProps {
  valor: number;
  meta: number;
  status: StatusRitmo;
  /** 0–1: onde a pessoa/time deveria estar hoje — vira o marcador vertical de 2px. */
  esperadoFrac: number;
  /** Classe de altura do trilho (padrão 8px; tabelas e cards da Time usam a fina). */
  altura?: string;
}

/** Barra de progresso da meta com o marcador de ritmo. */
export function ProgressBar({ valor, meta, status, esperadoFrac, altura = "h-2" }: ProgressBarProps) {
  const largura = meta > 0 ? Math.min(Math.max(valor / meta, 0), 1) * 100 : 0;
  const marcador = Math.min(Math.max(esperadoFrac, 0), 1) * 100;

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
      {meta > 0 && esperadoFrac > 0 && (
        <span
          aria-hidden
          className="absolute -bottom-[3px] -top-[3px] -ml-px w-[2px] rounded-full bg-fg"
          style={{ left: `${marcador}%` }}
        />
      )}
    </div>
  );
}
