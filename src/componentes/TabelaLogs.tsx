import type { LogAtividade } from "../lib/tipos-api";
import { CORPO_ROLAVEL, LINHA } from "./TabelaEventos";

const CELULA = "truncate px-[clamp(6px,0.6vw,14px)]";

/**
 * Logs de atividade do período da página (aba Logs da planilha
 * `PLANILHA_LOGS_ID`), do mais recente pro mais antigo. Mesmo visual e mesma
 * altura de linha da TabelaEventos, pra ficar alinhada com a tabela de
 * Confrarias acima; com mais logs do que cabem, o corpo rola. Usuário
 * mostra só o primeiro nome (o completo fica no `title`) e a fonte é a mesma
 * da TabelaEventos.
 */
export function TabelaLogs({ titulo, logs, vazio }: { titulo: string; logs: LogAtividade[]; vazio: string }) {
  return (
    <article className="glass-panel flex min-h-0 min-w-0 flex-1 flex-col gap-[clamp(4px,0.8vh,10px)] rounded-[24px] p-[clamp(10px,1.4vh,18px)]" aria-label={titulo}>
      <span className="p-1 text-[clamp(25px,1.94vh,28px)] font-bold uppercase leading-none tracking-[0.13em] text-muted">{titulo}</span>
      <div
        role="table"
        aria-label={titulo}
        className="flex min-h-0 flex-1 flex-col text-[clamp(16px,min(2.89vh,5vw),43px)] leading-none sm:text-[clamp(16px,min(2.89vh,2.78vw),43px)] xl:text-[clamp(16px,min(2.89vh,1.25vw),43px)]"
      >
        <div
          role="row"
          className="grid mt-3 grid-cols-[1fr_1.1fr_1.1fr] items-center border-b border-line pb-[clamp(3px,0.5vh,8px)] text-[clamp(21px,2.54vh,38px)] font-semibold sm:text-[clamp(17.5px,min(2.54vh,2.81vw),38px)] xl:text-[clamp(17.5px,min(2.54vh,1.35vw),38px)] uppercase tracking-[0.06em] text-muted"
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
        <div role="rowgroup" className={CORPO_ROLAVEL}>
          {logs.length === 0 ? (
            <p className="px-2 py-4 text-[clamp(20px,2.4vh,36px)] text-muted">{vazio}</p>
          ) : (
            logs.map((l, i) => (
              <div
                role="row"
                key={`${l.data}-${l.hora}-${i}`}
                className={`grid grid-cols-[1fr_1.1fr_1.1fr] ${LINHA} items-center border-b border-line last:border-0`}
              >
                <span role="cell" className={`${CELULA} font-bold`} title={l.usuario ?? undefined}>
                  {l.usuario?.split(" ")[0] ?? "—"}
                </span>
                <span role="cell" className={`${CELULA} font-bold`} title={l.atividade}>
                  {l.atividade}
                </span>
                <span role="cell" className={`${CELULA} font-bold`} title={l.cliente ?? undefined}>
                  {l.cliente ?? "—"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </article>
  );
}
