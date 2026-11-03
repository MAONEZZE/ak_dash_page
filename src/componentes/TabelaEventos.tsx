import { formatarDiaMesEvento, formatarNumero, instanteEvento } from "../lib/formato";
import type { EventoGeral } from "../lib/tipos-api";

/**
 * Altura de cada linha das tabelas da Geral (Eventos e Logs), em `em` pra
 * acompanhar a fonte: 1em de texto + 0,975em de folga (a folga era 0,65em e
 * cresceu 1,5×, pedido de 2026-11-02). O que não couber no card rola.
 */
export const LINHA = "h-[1.975em] shrink-0";
export const CORPO_ROLAVEL = "min-h-0 flex-1 overflow-y-auto";

const CELULA = "truncate px-[clamp(6px,0.6vw,14px)]";
/** Evento | Data | In. | Ap. | P. | R. — cabeçalho e linhas usam a mesma grade. */
const COLUNAS = "grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]";

/*
 * Fonte limitada também pela largura (vw) em cada grade da Geral — 1, 2 ou 4
 * colunas. Só com vh a data ("20/09 · 16:00", ~6,4em) passava da coluna e
 * truncava até na TV (1920×1080).
 *
 * A fonte é a mesma da TabelaLogs (pedido de 2026-11-02).
 */

/**
 * Eventos do mês: título, data, inscritos, aprovados, pendentes e rejeitados.
 * Com mais eventos do que cabem no card, o corpo da tabela rola.
 * As que já aconteceram ficam esmaecidas.
 */
export function TabelaEventos({ titulo, eventos, vazio }: { titulo: string; eventos: EventoGeral[]; vazio: string }) {
  const agora = new Date();
  return (
    <article className="glass-panel flex min-h-0 min-w-0 flex-1 flex-col gap-[clamp(4px,0.8vh,10px)] rounded-[24px] p-[clamp(10px,1.4vh,18px)]" aria-label={titulo}>
      <span className="p-1 text-[clamp(25px,1.94vh,28px)] font-bold uppercase leading-none tracking-[0.13em] text-muted">{titulo}</span>
      <div
        role="table"
        aria-label={titulo}
        className="flex min-h-0 flex-1 flex-col text-[clamp(16px,min(2.89vh,5vw),43px)] leading-none sm:text-[clamp(16px,min(2.89vh,2.78vw),43px)] xl:text-[clamp(16px,min(2.89vh,1.25vw),43px)]"
      >
        {/* Cabeçalho no tamanho do título do card: em 2x os rótulos não cabem num quarto da tela. */}
        <div
          role="row"
          className={`grid mt-3 ${COLUNAS} items-center border-b border-line pb-[clamp(3px,0.5vh,8px)] text-[clamp(21px,2.54vh,38px)] font-semibold sm:text-[clamp(17.5px,min(2.54vh,2.81vw),38px)] xl:text-[clamp(17.5px,min(2.54vh,1.35vw),38px)] uppercase tracking-[0.06em] text-muted`}
        >
          <span role="columnheader" className={CELULA}>
            Evento
          </span>
          <span role="columnheader" className={CELULA}>
            Data
          </span>
          <span role="columnheader" className={`${CELULA} text-right`}>
            In.
          </span>
          <span role="columnheader" className={`${CELULA} text-right`}>
            Ap.
          </span>
          <span role="columnheader" className={`${CELULA} text-right`}>
            P.
          </span>
          <span role="columnheader" className={`${CELULA} text-right`}>
            R.
          </span>
        </div>
        <div role="rowgroup" className={CORPO_ROLAVEL}>
          {eventos.length === 0 ? (
            <p className="px-2 py-4 text-[clamp(20px,2.4vh,36px)] text-muted">{vazio}</p>
          ) : (
            eventos.map((e) => (
              <div
                role="row"
                key={e.id}
                title={e.titulo}
                className={`grid ${COLUNAS} ${LINHA} items-center border-b border-line last:border-0 ${instanteEvento(e.data) < agora ? "opacity-45" : ""}`}
              >
                <span role="cell" className={`${CELULA} font-semibold`}>
                  {e.titulo}
                </span>
                <span role="cell" className={`${CELULA} font-semibold`}>
                  {formatarDiaMesEvento(e.data)}
                </span>
                <span role="cell" className={`${CELULA} text-right font-display font-bold`}>
                  {formatarNumero(e.inscritos)}
                </span>
                <span role="cell" className={`${CELULA} text-right font-display font-bold`}>
                  {formatarNumero(e.aprovados)}
                </span>
                <span role="cell" className={`${CELULA} text-right font-display font-bold`}>
                  {formatarNumero(e.pendentes)}
                </span>
                <span role="cell" className={`${CELULA} text-right font-display font-bold`}>
                  {formatarNumero(e.rejeitados)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </article>
  );
}
