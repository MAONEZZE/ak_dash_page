import type { ReactNode } from "react";
import { formatarNumero } from "../lib/formato";
import { umaCasa } from "../lib/funil";
import { COR_TEXTO, statusDoAtingimento } from "../lib/atingimento";
import type { DashboardFunil, MetricaTime } from "../lib/tipos-api";
import { ProgressBar } from "./ProgressBar";

function textoDias(n: number | null | undefined): string | null {
  return n === null || n === undefined ? null : `dias úteis restantes: ${formatarNumero(n)}`;
}

function CardMetrica({ linha, restante }: { linha: MetricaTime; restante: string | null }) {
  const status = linha.meta_periodo ? statusDoAtingimento(linha.pct_atingimento) : "sem_meta";
  const media = linha.media_necessaria;
  let linhaMedia: ReactNode = null;
  switch (media?.situacao) {
    case "pendente":
      linhaMedia = (
        <span>
          {[`${umaCasa(media.valor)} por ${media.unidade}`, restante]
            .filter((parte) => parte !== null)
            .join(" · ")}
        </span>
      );
      break;
    case "meta_batida":
      linhaMedia = <span>Meta batida</span>;
      break;
    case "expediente_encerrado":
      linhaMedia = <span>Expediente encerrado</span>;
      break;
    case "periodo_encerrado":
      linhaMedia = <span>Período encerrado</span>;
      break;
  }

  return (
    <li className="glass-panel flex flex-col gap-2 rounded-[24px] p-5">
      <span className="text-[13px] font-semibold uppercase tracking-[0.13em] text-muted">{linha.nome_exibicao}</span>
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-[32px] font-extrabold leading-none">{formatarNumero(linha.realizado)}</span>
          <span className="text-[16px] font-semibold text-muted">
            {`/ ${linha.meta_periodo === null ? "—" : formatarNumero(linha.meta_periodo)}`}
          </span>
        </span>
        {linha.pct_atingimento !== null && (
          <span className="text-[16px] font-bold">{`${umaCasa(linha.pct_atingimento)}%`}</span>
        )}
      </div>
      <ProgressBar valor={linha.realizado} meta={linha.meta_periodo ?? 0} status={status} />
      <div className="flex flex-col gap-1 text-[14px] font-semibold text-muted">
        {!linha.meta_periodo ? (
          <span>Meta aberta</span>
        ) : (
          <>
            {linha.falta_folga !== null && (
              <span>
                {linha.falta_folga.tipo === "falta" ? "Falta" : "Folga"}{" "}
                <span className={COR_TEXTO[status]}>{formatarNumero(linha.falta_folga.valor)}</span>
              </span>
            )}
            {linhaMedia}
          </>
        )}
      </div>
    </li>
  );
}

function ColunaRecorte({
  titulo,
  linhas,
  restante,
}: {
  titulo: string;
  linhas: MetricaTime[];
  restante: (linha: MetricaTime) => string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[15px] font-bold uppercase tracking-[0.13em] text-muted">{titulo}</h3>
      <ul aria-label={titulo} className="flex flex-col gap-3">
        {linhas.map((linha) => (
          <CardMetrica key={linha.metrica} linha={linha} restante={restante(linha)} />
        ))}
      </ul>
    </div>
  );
}

export function BlocoDashboardFunil({
  dashboard,
  diasUteisRestantes,
}: {
  dashboard: DashboardFunil;
  diasUteisRestantes?: { semanal: number | null; mensal: number | null };
}) {
  const { seller } = dashboard;

  return (
    <section aria-label="Dashboard" className="flex flex-col gap-4">
      {seller === null ? (
        <p>Nenhum seller ligado a este canal.</p>
      ) : (
        <>
          <h2 className="font-display text-[24px] font-bold tracking-tight">Dashboard · {seller.nome}</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ColunaRecorte
              titulo="Diário"
              linhas={dashboard.diario}
              restante={(linha) => (linha.horas_restantes === null ? null : `horas restantes: ${umaCasa(linha.horas_restantes)}`)}
            />
            <ColunaRecorte
              titulo="Semanal"
              linhas={dashboard.semanal}
              restante={() => textoDias(diasUteisRestantes?.semanal)}
            />
            <ColunaRecorte
              titulo="Mensal"
              linhas={dashboard.mensal}
              restante={() => textoDias(diasUteisRestantes?.mensal)}
            />
          </div>
        </>
      )}
    </section>
  );
}
