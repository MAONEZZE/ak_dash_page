import { formatarNumero } from "../lib/formato";
import { umaCasa } from "../lib/funil";
import { statusDoAtingimento } from "../lib/atingimento";
import type { DashboardFunil, MetricaTime } from "../lib/tipos-api";
import { ProgressBar } from "./ProgressBar";

function CardMetrica({ linha }: { linha: MetricaTime }) {
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
      <ProgressBar
        valor={linha.realizado}
        meta={linha.meta_periodo ?? 0}
        status={linha.meta_periodo ? statusDoAtingimento(linha.pct_atingimento) : "sem_meta"}
      />
    </li>
  );
}

function ColunaRecorte({ titulo, linhas }: { titulo: string; linhas: MetricaTime[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[15px] font-bold uppercase tracking-[0.13em] text-muted">{titulo}</h3>
      <ul aria-label={titulo} className="flex flex-col gap-3">
        {linhas.map((linha) => (
          <CardMetrica key={linha.metrica} linha={linha} />
        ))}
      </ul>
    </div>
  );
}

export function BlocoDashboardFunil({
  dashboard,
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
            <ColunaRecorte titulo="Diário" linhas={dashboard.diario} />
            <ColunaRecorte titulo="Semanal" linhas={dashboard.semanal} />
            <ColunaRecorte titulo="Mensal" linhas={dashboard.mensal} />
          </div>
        </>
      )}
    </section>
  );
}
