import {
  CARD_COMPACTO_BARRA,
  CARD_COMPACTO_CAIXA,
  CARD_COMPACTO_LABEL,
  CARD_COMPACTO_LEGENDA,
  CARD_COMPACTO_META,
  CARD_COMPACTO_MIUDO,
  CARD_COMPACTO_RODAPE,
  CARD_COMPACTO_VAO,
  escalaValorCompacto,
} from "../lib/card-compacto";

interface CardKpiProps {
  label: string;
  /** Tag pequena no canto (ex. "SDR"/"CLOSER") — omitida quando o card não distingue squad. */
  squadTag?: string;
  value: string;
  /** Denominador do card ("/ meta"). Omitido = card sem denominador (ex. Aprovados, que é número absoluto). */
  meta?: string;
  /** 0-100+ (sem cap na leitura, só a barra visual satura em 100). `null` = sem meta cadastrada, sem barra. Ignorado quando `indisponivel`. */
  pct: number | null;
  /** Métrica sem dado algum pro período/escopo (placeholder de página inteira) — sem barra, só a legenda. */
  indisponivel?: boolean;
  legenda: string;
  /** Variante escura (fundo `--color-bg-dark-2`) — linha de faturamento da Geral. */
  variante?: "claro" | "escuro";
  /**
   * "compacto" — card fluido dos 8 KPIs da Geral. O número fica logo abaixo do
   * título (vão curto e limitado) e a barra+legenda descem pro pé do card; a
   * sobra de altura, quando existe, cai entre os dois.
   */
  tamanho?: "normal" | "compacto";
}

/** Card de vidro do redesenho novo_template — usado nos grids de KPI de Comercial/Geral/Financeiro. */
export function CardKpi({ label, squadTag, value, meta, pct, indisponivel, legenda, variante = "claro", tamanho = "normal" }: CardKpiProps) {
  const largura = pct === null ? 0 : Math.min(Math.max(pct, 0), 100);
  const escuro = variante === "escuro";
  const compacto = tamanho === "compacto";

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl ${compacto ? CARD_COMPACTO_CAIXA : "min-h-[168px] gap-3.5 px-[18px] pb-[15px] pt-[17px]"} ${escuro ? "glass-panel-escuro" : "glass-panel"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`font-semibold uppercase tracking-[0.13em] ${compacto ? CARD_COMPACTO_LABEL : "text-[17px] leading-snug"} ${escuro ? "text-offwhite/74" : "text-fg/56"}`}
        >
          {label}
        </span>
        {squadTag && (
          <span
            className={`whitespace-nowrap font-bold ${compacto ? CARD_COMPACTO_MIUDO : "text-[17px]"} ${escuro ? "text-accent" : "text-accent-fg"}`}
          >
            {squadTag}
          </span>
        )}
      </div>
      <div className={`flex flex-wrap items-baseline gap-1.5 ${compacto ? CARD_COMPACTO_VAO : "mt-auto"}`}>
        <span
          className={`font-display font-extrabold leading-none tracking-tight ${compacto ? escalaValorCompacto(value) : "text-[50px]"} ${escuro ? "text-offwhite" : ""}`}
        >
          {value}
        </span>
        {meta !== undefined && (
          <span
            className={`whitespace-nowrap font-semibold leading-none ${compacto ? CARD_COMPACTO_META : "text-[19px]"} ${escuro ? "text-offwhite/60" : "text-fg/45"}`}
          >
            / {meta}
          </span>
        )}
      </div>
      {indisponivel || pct === null ? (
        <span
          className={`font-semibold ${compacto ? `${CARD_COMPACTO_RODAPE} ${CARD_COMPACTO_LEGENDA}` : "text-[17px]"} ${escuro ? "text-offwhite/60" : "text-fg/50"}`}
        >
          {legenda}
        </span>
      ) : (
        <div className={`flex flex-col ${compacto ? `${CARD_COMPACTO_RODAPE} gap-[clamp(3px,min(0.36vw,0.65vh),12px)]` : "gap-1.5"}`}>
          <div className={`overflow-hidden rounded-full ${compacto ? CARD_COMPACTO_BARRA : "h-[5px]"} ${escuro ? "bg-offwhite/18" : "bg-progress-track"}`}>
            <div className={`h-full rounded-full ${escuro ? "bg-accent" : "bg-accent-fg"}`} style={{ width: `${largura}%` }} />
          </div>
          <span className={`font-semibold ${compacto ? CARD_COMPACTO_LEGENDA : "text-[17px]"} ${escuro ? "text-offwhite/60" : "text-fg/50"}`}>
            {legenda}
          </span>
        </div>
      )}
    </article>
  );
}
