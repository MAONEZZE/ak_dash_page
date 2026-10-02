import {
  CARD_COMPACTO_BARRA,
  CARD_COMPACTO_CAIXA,
  CARD_COMPACTO_LABEL,
  CARD_COMPACTO_LEGENDA,
  CARD_COMPACTO_META,
  CARD_COMPACTO_NUMERO_NA_BASE,
  CARD_COMPACTO_RODAPE,
  CARD_COMPACTO_RODAPE_FIXO,
  CARD_COMPACTO_VAO,
  escalaValorCompacto,
  escalaValorCompactoDestaque,
} from "../lib/card-compacto";
import { formatarNumero } from "../lib/formato";
import { calcularRitmo } from "../lib/ritmo";
import type { DiasUteis } from "../lib/tipos-api";
import { ProgressBar } from "./ProgressBar";
import { StatusChip } from "./StatusChip";

interface CardKpiProps {
  label: string;
  value: string;
  /** Denominador do card ("/ meta"). Omitido = card sem denominador (ex. Aprovados, que é número absoluto). */
  meta?: string;
  /** 0-100+ (sem cap na leitura, só a barra visual satura em 100). `null` = sem meta cadastrada, sem barra. Ignorado quando `indisponivel` ou com `ritmo`. */
  pct?: number | null;
  /** Métrica sem dado algum pro período/escopo (placeholder de página inteira) — sem barra, só a legenda. */
  indisponivel?: boolean;
  legenda?: string;
  /**
   * Card com ritmo da meta (Comercial e cards claros da Geral): chip de status,
   * barra com o marcador de "onde deveria estar hoje" e rodapé
   * "Esperado hoje N · Projeção N (P%)". Substitui `pct`/`legenda`.
   */
  ritmo?: { realizado: number; meta: number | null; dias: DiasUteis };
  /** Variante escura (fundo `--color-bg-dark-2`) — linha de faturamento da Geral. */
  variante?: "claro" | "escuro";
  /**
   * "compacto" — card fluido dos 8 KPIs da Geral. O número fica logo abaixo do
   * título (vão curto e limitado) e a barra+legenda descem pro pé do card; a
   * sobra de altura, quando existe, cai entre os dois.
   */
  tamanho?: "normal" | "compacto";
  /**
   * Os dois cards de destaque da Geral (Faturamento e Liquidado). Duas coisas:
   * o número sai de baixo do rótulo e encosta na base do card — é o que põe os
   * quatro números da faixa de cima na mesma linha, já que as escalas
   * tipográficas diferem entre eles —, e ganha a escala 1,3× (o card não tem
   * meta, barra nem legenda, então sobra altura pra isso). O rodapé vira um vão
   * da altura das barrinhas do card de evento, só pra base bater.
   * Exige `tamanho="compacto"`.
   */
  destaque?: boolean;
}

/** Card de vidro do redesenho novo_template — usado nos grids de KPI de Comercial/Geral/Financeiro. */
export function CardKpi({
  label,
  value,
  meta,
  pct = null,
  indisponivel,
  legenda = "",
  ritmo,
  variante = "claro",
  tamanho = "normal",
  destaque = false,
}: CardKpiProps) {
  const largura = pct === null ? 0 : Math.min(Math.max(pct, 0), 100);
  const escuro = variante === "escuro";
  const compacto = tamanho === "compacto";
  const r = ritmo ? calcularRitmo(ritmo.realizado, ritmo.meta, ritmo.dias) : null;
  const semMeta = r?.status === "sem_meta";
  const textoRodape = compacto ? CARD_COMPACTO_LEGENDA : "text-[14px]";

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-[18px] ${compacto ? CARD_COMPACTO_CAIXA : "min-h-[168px] gap-3.5 px-[18px] pb-[15px] pt-[17px]"} ${escuro ? "glass-panel-escuro" : "glass-panel"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`font-semibold uppercase tracking-[0.13em] ${compacto ? CARD_COMPACTO_LABEL : "text-[17px] leading-snug"} ${escuro ? "text-offwhite/74" : "text-muted"}`}
        >
          {label}
        </span>
        {r && <StatusChip status={r.status} />}
      </div>
      <div
        className={`flex flex-wrap items-baseline gap-1.5 ${
          // Com ritmo, o StatusChip divide a linha do rótulo e ele quebra em duas:
          // o vão fixo fazia o card claro da Geral passar da altura na TV.
          destaque ? CARD_COMPACTO_NUMERO_NA_BASE : compacto ? (r ? "" : CARD_COMPACTO_VAO) : "mt-auto"
        }`}
      >
        <span
          className={`font-display font-extrabold leading-none tracking-tight ${
            compacto ? (destaque ? escalaValorCompactoDestaque(value) : escalaValorCompacto(value)) : "text-[50px]"
          } ${escuro ? "text-offwhite" : ""} ${semMeta ? "text-muted" : ""}`}
        >
          {value}
        </span>
        {meta !== undefined && !semMeta && (
          <span
            className={`whitespace-nowrap font-semibold leading-none ${compacto ? CARD_COMPACTO_META : "text-[19px]"} ${escuro ? "text-offwhite/60" : "text-muted"}`}
          >
            / {meta}
          </span>
        )}
      </div>
      {r && ritmo ? (
        semMeta ? (
          <span className={`font-semibold text-muted ${compacto ? `${CARD_COMPACTO_RODAPE} ${CARD_COMPACTO_LEGENDA}` : "mt-auto text-[14px]"}`}>
            Nenhuma meta definida no período
          </span>
        ) : (
          <div className={`flex flex-col ${compacto ? `${CARD_COMPACTO_RODAPE} gap-[clamp(4px,min(0.45vw,0.8vh),14px)]` : "gap-2"}`}>
            <ProgressBar
              valor={ritmo.realizado}
              meta={ritmo.meta ?? 0}
              status={r.status}
              esperadoFrac={r.esperadoFrac}
              altura={compacto ? CARD_COMPACTO_BARRA : "h-2"}
            />
            {/* No compacto (Geral/TV, card de 1/5 da tela) o rodapé encurta pra caber numa linha. */}
            <span className={`font-semibold text-muted ${textoRodape}`}>
              {compacto ? "Esperado" : "Esperado hoje"} {formatarNumero(Math.round(r.esperadoHoje))} · {compacto ? "Proj." : "Projeção"}{" "}
              {r.projecao === null
                ? "—"
                : compacto
                  ? `${Math.round((r.projecao / (ritmo.meta ?? 1)) * 100)}%`
                  : `${formatarNumero(Math.round(r.projecao))} (${Math.round((r.projecao / (ritmo.meta ?? 1)) * 100)}%)`}
            </span>
          </div>
        )
      ) : destaque ? (
        <div className={`${CARD_COMPACTO_RODAPE_FIXO} ${CARD_COMPACTO_BARRA}`} aria-hidden="true" />
      ) : indisponivel || pct === null ? (
        <span
          className={`font-semibold ${compacto ? `${CARD_COMPACTO_RODAPE} ${CARD_COMPACTO_LEGENDA}` : "text-[17px]"} ${escuro ? "text-offwhite/60" : "text-muted"}`}
        >
          {legenda}
        </span>
      ) : (
        <div className={`flex flex-col ${compacto ? `${CARD_COMPACTO_RODAPE} gap-[clamp(3px,min(0.36vw,0.65vh),12px)]` : "gap-1.5"}`}>
          <div className={`overflow-hidden rounded-full ${compacto ? CARD_COMPACTO_BARRA : "h-[5px]"} ${escuro ? "bg-[rgb(var(--color-offwhite-rgb)/18%)]" : "bg-progress-track"}`}>
            <div className={`h-full rounded-full ${escuro ? "bg-accent" : "bg-accent-fg"}`} style={{ width: `${largura}%` }} />
          </div>
          <span className={`font-semibold ${compacto ? CARD_COMPACTO_LEGENDA : "text-[17px]"} ${escuro ? "text-offwhite/60" : "text-muted"}`}>
            {legenda}
          </span>
        </div>
      )}
    </article>
  );
}
