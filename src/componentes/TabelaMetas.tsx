import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { agregarPorPessoa, naoDisponivel } from "../lib/insights";
import type { Metrica, PessoaComercial, StatusMetrica } from "../lib/tipos-api";
import { formatarNumero } from "../lib/formato";

// "Abaixo da meta" nunca é vermelho contra o verde da marca — falha
// daltonismo vermelho-verde (ver globals.css). Azul + ícone X é a combinação
// acessível.
const ESTADO_METRICA: Record<StatusMetrica, { rotulo: string; icone: typeof CheckCircle2; classe: string }> = {
  atingido: { rotulo: "Atingido", icone: CheckCircle2, classe: "text-accent-fg" },
  abaixo_da_meta: { rotulo: "Abaixo da meta", icone: XCircle, classe: "text-status-bad" },
  sem_preenchimento: { rotulo: "Sem preenchimento", icone: MinusCircle, classe: "text-fg/50" },
};

function SeloStatus({ status }: { status: StatusMetrica }) {
  const { rotulo, icone: Icone, classe } = ESTADO_METRICA[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${classe}`}>
      <Icone className="size-3.5 shrink-0" aria-hidden />
      {rotulo}
    </span>
  );
}

function BadgeLacuna({ dias }: { dias: number }) {
  if (dias <= 0) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-border-2 px-1.5 py-0.5 text-[11px] text-fg/60">
      {dias} dia{dias > 1 ? "s" : ""} sem registro
    </span>
  );
}

function BarraProgresso({ metrica }: { metrica: Metrica }) {
  if (metrica.status === "sem_preenchimento") {
    return (
      <div
        className="h-2 w-24 rounded-full"
        style={{
          background: "repeating-linear-gradient(135deg, var(--color-hachura-a) 0 4px, var(--color-hachura-b) 4px 8px)",
        }}
        aria-hidden
      />
    );
  }
  const pct = metrica.meta_periodo > 0 ? Math.min((metrica.realizado / metrica.meta_periodo) * 100, 100) : 0;
  return (
    <div className="h-2 w-24 overflow-hidden rounded-full bg-progress-track" aria-hidden>
      <div
        className={`h-full rounded-full ${metrica.status === "atingido" ? "bg-status-good" : "bg-status-bad"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function LinhaMetricaIndividual({ metrica, periodoParcial }: { metrica: Metrica; periodoParcial: boolean }) {
  const indisponivel = naoDisponivel(metrica, periodoParcial);
  return (
    <tr className="border-t border-border-2">
      <td className="py-1.5 pr-3 text-fg/80">{metrica.nome_exibicao}</td>
      <td className="py-1.5 pr-3 text-right tabular-nums">{indisponivel ? "—" : formatarNumero(metrica.realizado)}</td>
      <td className="py-1.5 pr-3 text-right tabular-nums text-fg/60">{indisponivel ? "—" : formatarNumero(metrica.meta_periodo)}</td>
      <td className="py-1.5 pr-3">{indisponivel ? <span className="text-xs text-fg/50">—</span> : <BarraProgresso metrica={metrica} />}</td>
      <td className="py-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {indisponivel ? (
            <span className="text-xs text-fg/50">Não disponível neste período</span>
          ) : (
            <>
              <SeloStatus status={metrica.status} />
              <BadgeLacuna dias={metrica.dias_com_lacuna} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function TabelaIndividual({ pessoa, periodoParcial }: { pessoa: PessoaComercial; periodoParcial: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="text-left text-xs text-fg/60">
            <th className="py-1.5 pr-3 font-normal">Métrica</th>
            <th className="py-1.5 pr-3 text-right font-normal">Realizado</th>
            <th className="py-1.5 pr-3 text-right font-normal">Meta</th>
            <th className="py-1.5 pr-3 font-normal">Progresso</th>
            <th className="py-1.5 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {pessoa.metricas.map((metrica) => (
            <LinhaMetricaIndividual key={metrica.metrica} metrica={metrica} periodoParcial={periodoParcial} />
          ))}
        </tbody>
      </table>
      {pessoa.planilhas_origem.length > 1 && (
        <p className="pt-2 text-xs text-fg/60">
          Somado de {pessoa.planilhas_origem.length} planilhas: {pessoa.planilhas_origem.join(", ")}
        </p>
      )}
    </div>
  );
}

function TabelaComparativo({ pessoas, periodoParcial }: { pessoas: PessoaComercial[]; periodoParcial: boolean }) {
  const [params, setParams] = useSearchParams();

  function isolar(email: string) {
    const novo = new URLSearchParams(params);
    novo.delete("pessoas");
    novo.append("pessoas", email);
    setParams(novo, { replace: true });
  }

  const linhas = agregarPorPessoa(pessoas, periodoParcial).sort((a, b) => {
    if (b.atingidas !== a.atingidas) return b.atingidas - a.atingidas;
    return (b.cobertura ?? -1) - (a.cobertura ?? -1);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-xs text-fg/60">
            <th className="py-1.5 pr-3 font-normal">Pessoa</th>
            <th className="hidden py-1.5 pr-3 font-normal sm:table-cell">Time</th>
            <th className="py-1.5 pr-3 text-right font-normal">Lançadas</th>
            <th className="py-1.5 pr-3 text-right font-normal">Atingidas</th>
            <th className="hidden py-1.5 pr-3 text-right font-normal sm:table-cell">Realizado</th>
            <th className="py-1.5 text-right font-normal">Cobertura</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr
              key={linha.email}
              className="cursor-pointer border-t border-border-2 hover:bg-bg/50"
              onClick={() => isolar(linha.email)}
              title={`Ver visão individual de ${linha.nome ?? linha.email}`}
            >
              <td className="py-1.5 pr-3 font-medium">{linha.nome ?? linha.email}</td>
              <td className="hidden truncate py-1.5 pr-3 text-fg/60 sm:table-cell">{linha.planilhasOrigem.join(", ") || "—"}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums">
                {linha.lancadas}/{linha.total}
              </td>
              <td className="py-1.5 pr-3 text-right tabular-nums">{linha.atingidas}</td>
              <td className="hidden py-1.5 pr-3 text-right tabular-nums text-fg/60 sm:table-cell">{formatarNumero(linha.realizado)}</td>
              <td className="py-1.5 text-right tabular-nums">
                {linha.cobertura === null ? "—" : `${Math.round(linha.cobertura * 100)}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface TabelaMetasProps {
  pessoas: PessoaComercial[];
  periodoParcial: boolean;
}

export function TabelaMetas({ pessoas, periodoParcial }: TabelaMetasProps) {
  if (pessoas.length === 1) {
    return <TabelaIndividual pessoa={pessoas[0]} periodoParcial={periodoParcial} />;
  }
  return <TabelaComparativo pessoas={pessoas} periodoParcial={periodoParcial} />;
}
