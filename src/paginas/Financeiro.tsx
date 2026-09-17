import { CardKpi } from "../componentes/CardKpi";
import { GaugeMeta } from "../componentes/GaugeMeta";
import { MarcadorGlobal } from "../componentes/MarcadorGlobal";

const MENSAGEM_INDISPONIVEL = "Em breve — aguardando CSV do financeiro";

const KPIS_FINANCEIRO = [
  "Faturamento",
  "Recebimentos / caixa",
  "Inadimplência",
  "Margem",
  "Despesas",
  "EBITDA",
  "Contas a receber",
  "Contas a pagar",
];

/** Placeholder no layout novo — backend ainda não expõe métricas financeiras (ver docs/plans/dashboard-akeel.md). */
export function Financeiro() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-display text-4xl font-semibold tracking-tight">Financeiro</span>
        <MarcadorGlobal />
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {KPIS_FINANCEIRO.map((label) => (
          <CardKpi key={label} label={label} value="—" meta="—" pct={0} indisponivel legenda={MENSAGEM_INDISPONIVEL} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2.15fr)_minmax(272px,1fr)]">
        <article className="glass-panel flex flex-col gap-3 rounded-2xl p-5">
          <span className="font-display text-3xl font-semibold tracking-tight">Caixa, margem e obrigações</span>
          <p className="text-xl text-fg/60">{MENSAGEM_INDISPONIVEL}.</p>
        </article>
        <GaugeMeta pct={null} faltamLabel="—" caption={MENSAGEM_INDISPONIVEL} />
      </section>
    </div>
  );
}
