import type { CSSProperties } from "react";
import { COR_TEXTO, statusDoAtingimento } from "../lib/atingimento";
import { formatarNumero } from "../lib/formato";
import type { FaltaFolga } from "../lib/tipos-api";

/**
 * Pé do card de métrica (Comercial e Time): "Falta X" e "Y% de atingimento",
 * com os números na cor do terço da meta. Sem meta (null ou 0): "Meta aberta".
 */
export function RodapeAtingimento({
  meta,
  pct,
  faltaFolga,
  className = "text-[14px]",
  style,
}: {
  meta: number | null;
  pct: number | null;
  faltaFolga: FaltaFolga | null;
  className?: string;
  style?: CSSProperties;
}) {
  if (!meta) {
    return (
      <span className={`font-semibold text-muted ${className}`} style={style}>
        Meta aberta
      </span>
    );
  }
  const cor = COR_TEXTO[statusDoAtingimento(pct)];
  return (
    <div className={`flex items-center justify-between gap-2 font-semibold text-muted ${className}`} style={style}>
      {faltaFolga && (
        <span>
          {faltaFolga.tipo === "falta" ? "Falta" : "Folga"} <span className={cor}>{formatarNumero(faltaFolga.valor)}</span>
        </span>
      )}
      {pct !== null && (
        <span>
          <span className={cor}>{formatarNumero(pct)}%</span> de atingimento
        </span>
      )}
    </div>
  );
}
