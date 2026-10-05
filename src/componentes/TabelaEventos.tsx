import { formatarDiaMesEvento, formatarNumero, instanteEvento } from "../lib/formato";
import type { EventoGeral } from "../lib/tipos-api";

export const EVENTOS_POR_TABELA = 10;

const CELULA = "truncate px-[clamp(6px,0.6vw,14px)]";

/*
 * Fonte limitada também pela largura (vw) em cada grade da Geral — 1, 2 ou 4
 * colunas. Só com vh a data ("20/09 · 16:00", ~6,4em) passava da coluna e
 * truncava até na TV (1920×1080).
 */

/**
 * Confrarias do mês: data, inscritos e aprovados (até 10 na Geral).
 * A grade sempre reserva as 10 linhas, então a altura de cada linha
 * não muda com a quantidade de eventos. As que já aconteceram ficam esmaecidas.
 */
export function TabelaEventos({ titulo, eventos, vazio }: { titulo: string; eventos: EventoGeral[]; vazio: string }) {
  const agora = new Date();
  return (
    <article className="glass-panel flex min-h-0 min-w-0 flex-1 flex-col gap-[clamp(4px,0.8vh,10px)] rounded-[24px] p-[clamp(10px,1.4vh,18px)]" aria-label={titulo}>
      <span className="p-1 text-[clamp(20px,1.55vh,22px)] font-bold uppercase leading-none tracking-[0.13em] text-muted">{titulo}</span>
      <div
        role="table"
        aria-label={titulo}
        className="grid min-h-0 flex-1 text-[clamp(20px,min(4.05vh,6.9vw),60px)] leading-none sm:text-[clamp(20px,min(4.05vh,3.9vw),60px)] xl:text-[clamp(20px,min(4.05vh,1.95vw),60px)]"
        style={{ gridTemplateRows: `auto repeat(${EVENTOS_POR_TABELA}, minmax(0, 1fr))` }}
      >
        {/* Cabeçalho no tamanho do título do card: em 2x os rótulos não cabem num quarto da tela. */}
        <div
          role="row"
          className="grid mt-3 grid-cols-[1.6fr_1fr_1fr] items-center border-b border-line pb-[clamp(3px,0.5vh,8px)] text-[clamp(17px,2.03vh,30px)] font-semibold sm:text-[clamp(14px,min(2.03vh,2.25vw),30px)] xl:text-[clamp(14px,min(2.03vh,1.08vw),30px)] uppercase tracking-[0.06em] text-muted"
        >
          <span role="columnheader" className={CELULA}>
            Data
          </span>
          <span role="columnheader" className={`${CELULA} text-right`}>
            In.
          </span>
          <span role="columnheader" className={`${CELULA} text-right`}>
            Ap.
          </span>
        </div>
        {eventos.length === 0 ? (
          <p className="row-span-2 self-center px-2 text-[clamp(20px,2.4vh,36px)] text-muted">{vazio}</p>
        ) : (
          eventos.map((e) => (
            <div
              role="row"
              key={e.id}
              title={e.titulo}
              className={`grid grid-cols-[1.6fr_1fr_1fr] items-center border-b border-line last:border-0 ${instanteEvento(e.data) < agora ? "opacity-45" : ""}`}
            >
              <span role="cell" className={`${CELULA} font-semibold`}>
                {formatarDiaMesEvento(e.data)}
              </span>
              <span role="cell" className={`${CELULA} text-right font-display font-bold`}>
                {formatarNumero(e.inscritos)}
              </span>
              <span role="cell" className={`${CELULA} text-right font-display font-bold`}>
                {formatarNumero(e.aprovados)}
              </span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
