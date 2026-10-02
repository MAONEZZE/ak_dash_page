import { CircleAlert, CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";
import type { StatusRitmo } from "../lib/ritmo";

const VISUAL: Record<StatusRitmo, { texto: string; Icone: typeof CircleCheck; classe: string }> = {
  no_ritmo: { texto: "No ritmo", Icone: CircleCheck, classe: "bg-ok-bg text-ok" },
  atras: { texto: "Atrás", Icone: TriangleAlert, classe: "bg-warn-bg text-warn" },
  muito_atras: { texto: "Muito atrás", Icone: CircleAlert, classe: "bg-bad-bg text-bad" },
  sem_meta: { texto: "Sem meta", Icone: CircleDashed, classe: "bg-surface-2 text-muted" },
};

/** Status de ritmo da meta — sempre ícone + texto, nunca só cor. */
export function StatusChip({ status, className = "" }: { status: StatusRitmo; className?: string }) {
  const { texto, Icone, classe } = VISUAL[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-bold leading-[18px] ${classe} ${className}`}>
      <Icone className="size-3.5" aria-hidden />
      {texto}
    </span>
  );
}
