import { agregarConsolidado } from "../lib/insights";
import { formatarNumero } from "../lib/formato";
import type { PessoaComercial } from "../lib/tipos-api";

interface Props {
  pessoas: PessoaComercial[];
  periodoParcial: boolean;
  /** Emails selecionados no filtro — [] = "Todas" (D13). Só decide o título; a agregação já vem filtrada em `pessoas`. */
  pessoasSelecionadas: string[];
}

function formatarPct(valor: number | null): string {
  return valor === null ? "—" : `${Math.round(valor * 100)}%`;
}

function tituloConsolidado(pessoas: PessoaComercial[], pessoasSelecionadas: string[]): string {
  if (pessoasSelecionadas.length === 0) return "Consolidado do time";
  if (pessoas.length === 1) return `de ${pessoas[0].nome ?? pessoas[0].email}`;
  return `de ${pessoas.length} pessoas`;
}

function notaNaoDisponivel(qtd: number): string {
  return `${qtd} métrica${qtd > 1 ? "s" : ""} não disponíve${qtd > 1 ? "is" : "l"} neste período`;
}

export function Insights({ pessoas, periodoParcial, pessoasSelecionadas }: Props) {
  const consolidado = agregarConsolidado(pessoas, periodoParcial);
  const { contagemStatus, naoDisponivelCount } = consolidado;
  const progresso = consolidado.pctGeral === null ? 0 : Math.min(consolidado.pctGeral * 100, 100);

  const kpis = [
    { rotulo: "Cobertura de lançamento", valor: formatarPct(consolidado.coberturaLancto) },
    { rotulo: "Atingidas", valor: formatarNumero(contagemStatus.atingido) },
    { rotulo: "Abaixo da meta", valor: formatarNumero(contagemStatus.abaixo_da_meta) },
    { rotulo: "Sem lançamento", valor: formatarNumero(contagemStatus.sem_preenchimento) },
  ];

  return (
    <div className="rounded-[7px] border border-border-2 p-4">
      <h3 className="text-sm font-medium text-fg/70">{tituloConsolidado(pessoas, pessoasSelecionadas)}</h3>
      <p className="mt-1 text-[44px] font-semibold leading-none tabular-nums">{formatarNumero(consolidado.realizadoTotal)}</p>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-progress-track"
        role="progressbar"
        aria-valuenow={consolidado.pctGeral === null ? undefined : Math.round(consolidado.pctGeral * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso vs. meta do período"
      >
        <div className="h-full rounded-full bg-accent-fg" style={{ width: `${progresso}%` }} />
      </div>

      <p className="mt-1.5 text-xs text-fg/60">
        {formatarPct(consolidado.pctGeral)} da meta do período
        {naoDisponivelCount > 0 && <> · {notaNaoDisponivel(naoDisponivelCount)}</>}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.rotulo} className="rounded-[7px] border border-border-2 p-2">
            <p className="text-[22px] font-semibold tabular-nums">{kpi.valor}</p>
            <p className="text-xs text-fg/60">{kpi.rotulo}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-fg/50">
        Soma absoluta do período — não pondera por meta individual; cada pessoa pode ter meta diferente.
      </p>
    </div>
  );
}
