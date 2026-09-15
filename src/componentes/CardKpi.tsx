interface CardKpiProps {
  label: string;
  /** Tag pequena no canto (ex. "SDR"/"CLOSER") — omitida quando o card não distingue squad. */
  squadTag?: string;
  value: string;
  meta: string;
  /** 0-100+ (sem cap na leitura, só a barra visual satura em 100). `null` = sem meta cadastrada, sem barra. Ignorado quando `indisponivel`. */
  pct: number | null;
  /** Métrica sem dado algum pro período/escopo (placeholder de página inteira) — sem barra, só a legenda. */
  indisponivel?: boolean;
  legenda: string;
  /** Variante escura (fundo `--color-bg-dark-2`) — linha de faturamento da Geral. */
  variante?: "claro" | "escuro";
  /** "compacto" — altura fixa baixa, usado nos 8 cards da Geral (a tabela abaixo é o foco da página). */
  tamanho?: "normal" | "compacto";
}

/** Card de vidro do redesenho novo_template — usado nos grids de KPI de Comercial/Geral/Financeiro. */
export function CardKpi({ label, squadTag, value, meta, pct, indisponivel, legenda, variante = "claro", tamanho = "normal" }: CardKpiProps) {
  const largura = pct === null ? 0 : Math.min(Math.max(pct, 0), 100);
  const escuro = variante === "escuro";
  const compacto = tamanho === "compacto";

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl ${compacto ? "h-[160px] p-5" : "min-h-[168px] gap-3.5 px-[18px] pb-[15px] pt-[17px]"} ${escuro ? "glass-panel-escuro" : "glass-panel"}`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`font-semibold uppercase tracking-[0.13em] ${compacto ? "text-[19px] leading-none" : "text-[10.5px] leading-snug"} ${escuro ? "text-offwhite/74" : "text-fg/56"}`}
        >
          {label}
        </span>
        {squadTag && <span className={`whitespace-nowrap text-[11.5px] font-bold ${escuro ? "text-accent" : "text-accent-fg"}`}>{squadTag}</span>}
      </div>
      <div className="mt-auto flex flex-wrap items-baseline gap-1.5">
        <span
          className={`font-display font-extrabold leading-none tracking-tight ${compacto ? "text-[36px]" : "text-[32px]"} ${escuro ? "text-offwhite" : ""}`}
        >
          {value}
        </span>
        <span className={`whitespace-nowrap font-semibold leading-none ${compacto ? "text-[22px]" : "text-xs"} ${escuro ? "text-offwhite/60" : "text-fg/45"}`}>
          / {meta}
        </span>
      </div>
      {indisponivel || pct === null ? (
        <span className={`font-semibold ${compacto ? "text-[19px] leading-none" : "text-[11px]"} ${escuro ? "text-offwhite/60" : "text-fg/50"}`}>
          {legenda}
        </span>
      ) : (
        <div className={`flex flex-col ${compacto ? "gap-1" : "gap-1.5"}`}>
          <div className={`h-[5px] overflow-hidden rounded-full ${escuro ? "bg-offwhite/18" : "bg-progress-track"}`}>
            <div className={`h-full rounded-full ${escuro ? "bg-accent" : "bg-accent-fg"}`} style={{ width: `${largura}%` }} />
          </div>
          <span className={`font-semibold ${compacto ? "text-[19px] leading-none" : "text-[11px]"} ${escuro ? "text-offwhite/60" : "text-fg/50"}`}>
            {legenda}
          </span>
        </div>
      )}
    </article>
  );
}
