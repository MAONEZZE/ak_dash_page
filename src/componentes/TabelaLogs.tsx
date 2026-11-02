import type { LogAtividade } from "../lib/tipos-api";
import { EVENTOS_POR_TABELA } from "./TabelaEventos";

const CELULA = "truncate px-[clamp(6px,0.6vw,14px)]";

/**
 * Logs de atividade do período da página (aba Logs da planilha
 * `PLANILHA_LOGS_ID`), do mais recente pro mais antigo. Mesmo visual e mesma
 * grade de 10 linhas da TabelaEventos, pra ficar alinhada com a tabela de
 * Confrarias ao lado.
 */
export function TabelaLogs({ titulo, logs, vazio }: { titulo: string; logs: LogAtividade[]; vazio: string }) {
  return (
    <article className="glass-panel flex min-h-0 min-w-0 flex-1 flex-col gap-[clamp(4px,0.8vh,10px)] rounded-[24px] p-[clamp(10px,1.4vh,18px)]" aria-label={titulo}>
      <span className="p-1 text-[clamp(20px,1.55vh,22px)] font-bold uppercase leading-none tracking-[0.13em] text-muted">{titulo}</span>
      <div
        role="table"
        aria-label={titulo}
        className="grid min-h-0 flex-1 text-[clamp(16px,min(3vh,5.2vw),44px)] leading-none sm:text-[clamp(16px,min(3vh,2.9vw),44px)] xl:text-[clamp(14px,min(3vh,1.3vw),44px)]"
        style={{ gridTemplateRows: `auto repeat(${Math.max(EVENTOS_POR_TABELA, logs.length)}, minmax(0, 1fr))` }}
      >
        <div
          role="row"
          className="grid mt-3 grid-cols-[1fr_1.1fr_1.1fr] items-center border-b border-line pb-[clamp(3px,0.5vh,8px)] text-[clamp(17px,2.03vh,30px)] font-semibold sm:text-[clamp(14px,min(2.03vh,2.25vw),30px)] xl:text-[clamp(14px,min(2.03vh,1.08vw),30px)] uppercase tracking-[0.06em] text-muted"
        >
          <span role="columnheader" className={CELULA}>
            Usuário
          </span>
          <span role="columnheader" className={CELULA}>
            Atividade
          </span>
          <span role="columnheader" className={CELULA}>
            Cliente
          </span>
        </div>
        {logs.length === 0 ? (
          <p className="row-span-2 self-center px-2 text-[clamp(20px,2.4vh,36px)] text-muted">{vazio}</p>
        ) : (
          logs.map((l, i) => (
            <div role="row" key={`${l.data}-${l.hora}-${i}`} className="grid grid-cols-[1fr_1.1fr_1.1fr] items-center border-b border-line last:border-0">
              <span role="cell" className={`${CELULA} font-semibold`} title={l.usuario ?? undefined}>
                {l.usuario ?? "—"}
              </span>
              <span role="cell" className={CELULA} title={l.atividade}>
                {l.atividade}
              </span>
              <span role="cell" className={CELULA} title={l.cliente ?? undefined}>
                {l.cliente ?? "—"}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
