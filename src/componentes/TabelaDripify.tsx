import { formatarNumero } from "../lib/formato";
import type { ContaDripify } from "../lib/tipos-api";
import { EVENTOS_POR_TABELA } from "./TabelaEventos";

const CELULA = "truncate px-[clamp(6px,0.6vw,14px)]";

/**
 * Contas do Dripify no período da página: conexões aceitas e números
 * captados por conta. Mesmo visual e mesma grade de 10 linhas da
 * TabelaEventos, pra ficar alinhada com a tabela de Confrarias ao lado.
 */
export function TabelaDripify({ titulo, contas, vazio }: { titulo: string; contas: ContaDripify[]; vazio: string }) {
  return (
    <article className="glass-panel flex min-h-0 min-w-0 flex-1 flex-col gap-[clamp(4px,0.8vh,10px)] rounded-[24px] p-[clamp(10px,1.4vh,18px)]" aria-label={titulo}>
      <span className="p-1 text-[clamp(20px,1.55vh,22px)] font-bold uppercase leading-none tracking-[0.13em] text-muted">{titulo}</span>
      <div
        role="table"
        aria-label={titulo}
        className="grid min-h-0 flex-1 text-[clamp(20px,min(4.05vh,6.9vw),60px)] leading-none sm:text-[clamp(20px,min(4.05vh,3.9vw),60px)] xl:text-[clamp(20px,min(4.05vh,1.95vw),60px)]"
        style={{ gridTemplateRows: `auto repeat(${Math.max(EVENTOS_POR_TABELA, contas.length)}, minmax(0, 1fr))` }}
      >
        <div
          role="row"
          className="grid mt-3 grid-cols-[1.4fr_1fr_1fr] items-center border-b border-line pb-[clamp(3px,0.5vh,8px)] text-[clamp(17px,2.03vh,30px)] font-semibold sm:text-[clamp(14px,min(2.03vh,2.25vw),30px)] xl:text-[clamp(14px,min(2.03vh,1.08vw),30px)] uppercase tracking-[0.06em] text-muted"
        >
          <span role="columnheader" className={CELULA}>
            Conta
          </span>
          <span role="columnheader" className={`${CELULA} text-right`} title="Conexões Aceitas">
            Conexões Aceitas
          </span>
          <span role="columnheader" className={`${CELULA} text-right`} title="Números Captados">
            Números Captados
          </span>
        </div>
        {contas.length === 0 ? (
          <p className="row-span-2 self-center px-2 text-[clamp(20px,2.4vh,36px)] text-muted">{vazio}</p>
        ) : (
          contas.map((c, i) => (
            <div role="row" key={`${c.conta}-${i}`} className="grid grid-cols-[1.4fr_1fr_1fr] items-center border-b border-line last:border-0">
              <span role="cell" className={`${CELULA} font-semibold`}>
                {c.conta}
              </span>
              <span role="cell" className={`${CELULA} text-right font-display font-bold`}>
                {formatarNumero(c.conexoes_aceitas)}
              </span>
              <span role="cell" className={`${CELULA} text-right font-display font-bold`}>
                {formatarNumero(c.numeros_captados)}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
