import { agregarConsolidado, agregarPorMetrica } from "../lib/insights";
import { GraficoEvolucaoLinha } from "./GraficoEvolucaoLinha";
import { GraficoRealizadoMeta } from "./GraficoRealizadoMeta";
import { GraficoStatusPizza } from "./GraficoStatusPizza";
import { Insights } from "./Insights";
import { TabelaMetas } from "./TabelaMetas";
import type { RespostaComercial } from "../lib/tipos-api";

interface Props {
  dado: RespostaComercial;
  pessoasSelecionadas: string[];
}

/** Hero + gráficos + tabela derivados 100% do que o BFF já manda — sem estado, sem fetch próprio. */
export function VisaoGeralComercial({ dado, pessoasSelecionadas }: Props) {
  const primeiraPessoaComMetricas = dado.pessoas.find((p) => p.metricas.length > 0);
  const consolidado = agregarConsolidado(dado.pessoas, dado.periodo_parcial);
  const porMetrica = agregarPorMetrica(dado.pessoas, dado.periodo_parcial);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(250px,1.05fr)_1.35fr]">
        <div className="flex flex-col gap-4">
          <Insights pessoas={dado.pessoas} periodoParcial={dado.periodo_parcial} pessoasSelecionadas={pessoasSelecionadas} />
          <div>
            <h3 className="mb-2 text-xs font-medium text-fg/60">Distribuição de status</h3>
            <GraficoStatusPizza consolidado={consolidado} />
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-xs font-medium text-fg/60">Realizado vs. meta por métrica</h3>
          <GraficoRealizadoMeta metricas={porMetrica} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium text-fg/60">Evolução diária do time</h3>
        <GraficoEvolucaoLinha serieDiaria={dado.serie_diaria} metricasDisponiveis={primeiraPessoaComMetricas?.metricas ?? []} />
      </div>

      <TabelaMetas pessoas={dado.pessoas} periodoParcial={dado.periodo_parcial} />
    </div>
  );
}
