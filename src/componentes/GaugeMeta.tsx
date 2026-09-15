interface GaugeMetaProps {
  /** 0-100, ou null quando não há base pra calcular (sem meta, sem dado). */
  pct: number | null;
  faltamLabel: string;
  caption: string;
}

// Geometria fixa do template: viewBox 200x112, arco de raio 84 (M16 100 A84 84 0 0 1 184 100).
const COMPRIMENTO_ARCO = 263.9;

/** Gauge circular do redesenho novo_template — atingimento de meta. */
export function GaugeMeta({ pct, faltamLabel, caption }: GaugeMetaProps) {
  const pctClamp = pct === null ? 0 : Math.min(Math.max(pct, 0), 100);
  const dash = `${((COMPRIMENTO_ARCO * pctClamp) / 100).toFixed(1)} ${COMPRIMENTO_ARCO}`;

  return (
    <article className="glass-panel flex flex-col gap-3 rounded-2xl px-[21px] pb-5 pt-[19px]">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.13em] text-fg/56">Atingimento da meta</span>
      <div className="flex flex-col items-center gap-0.5">
        <svg viewBox="0 0 200 112" className="w-full max-w-[220px]">
          <path d="M16 100 A84 84 0 0 1 184 100" fill="none" className="stroke-border-2" strokeWidth={14} />
          <path d="M16 100 A84 84 0 0 1 184 100" fill="none" className="stroke-accent-fg" strokeWidth={14} strokeDasharray={dash} />
        </svg>
        <span className="font-display -mt-7 text-[38px] font-extrabold leading-none tracking-tight">
          {pct === null ? "—" : `${Math.round(pctClamp)}%`}
        </span>
        <span className="mt-1.5 text-center text-xs text-fg/55">{caption}</span>
      </div>
      <div className="flex justify-between border-t border-border-2 pt-[11px]">
        <span className="text-xs text-fg/55">Faltam</span>
        <span className="text-xs font-bold text-accent-fg">{faltamLabel}</span>
      </div>
    </article>
  );
}
