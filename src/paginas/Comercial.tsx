import { useCallback, useEffect, useState } from "react";
import { CardKpi } from "../componentes/CardKpi";
import { GaugeMeta } from "../componentes/GaugeMeta";
import { GraficoAreaMeta } from "../componentes/GraficoAreaMeta";
import { TimeComercialLista, type PessoaUnificada } from "../componentes/TimeComercialLista";
import { buscarComercialCloser, buscarComercialSdr } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarNumero } from "../lib/formato";
import { agregarConsolidado, agregarPorMetrica } from "../lib/insights";
import { useFiltrosAtuais } from "../lib/periodo";
import { useSquadAtual, type Squad } from "../lib/squad";
import { METRICAS_SDR } from "../lib/tipos-api";
import type { Granularidade, Metrica, RespostaComercial } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

interface EstadoBloco {
  dado: RespostaComercial | null;
  carregando: boolean;
  erro: string | null;
}

const ESTADO_INICIAL: EstadoBloco = { dado: null, carregando: true, erro: null };

const RANGE_LABEL_ADJ: Record<Granularidade, string> = { dia: "diária", semana: "semanal", mes: "mensal", ano: "anual" };
const CHART_TITLE: Record<Granularidade, string> = {
  dia: "Dias do mês atual",
  semana: "Dias da semana",
  mes: "Progressão dos meses",
  ano: "Progressão dos anos",
};

const SQUAD_LABEL: Record<Squad, string> = { todos: "do time", sdr: "dos SDRs", closer: "dos closers" };

function squadDaMetrica(metrica: string): "sdr" | "closer" {
  return (METRICAS_SDR as readonly string[]).includes(metrica) ? "sdr" : "closer";
}

function primeiraComMetricas(dado: RespostaComercial | null): Metrica[] {
  return dado?.pessoas.find((p) => p.metricas.length > 0)?.metricas ?? [];
}

export function Comercial() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const [sdr, setSdr] = useState<EstadoBloco>(ESTADO_INICIAL);
  const [closer, setCloser] = useState<EstadoBloco>(ESTADO_INICIAL);
  // O filtro de squad vive no header, à direita do período — a página só lê.
  const squad = useSquadAtual();
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const { registrar } = useAtualizacao();

  const carregar = useCallback(async () => {
    setAtualizando(true);
    setSdr((atual) => ({ ...atual, carregando: true }));
    setCloser((atual) => ({ ...atual, carregando: true }));

    const params = { granularidade, periodo };

    await Promise.all([
      buscarComercialSdr(params)
        .then((dado) => setSdr({ dado, carregando: false, erro: null }))
        .catch((erro: unknown) =>
          setSdr({ dado: null, carregando: false, erro: erro instanceof Error ? erro.message : "Falha ao carregar SDRs." }),
        ),
      buscarComercialCloser(params)
        .then((dado) => setCloser({ dado, carregando: false, erro: null }))
        .catch((erro: unknown) =>
          setCloser({ dado: null, carregando: false, erro: erro instanceof Error ? erro.message : "Falha ao carregar Closers." }),
        ),
    ]);

    setAtualizadoEm(new Date());
    setAtualizando(false);
  }, [granularidade, periodo]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, INTERVALO_AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [carregar]);

  // Header vive fora da árvore desta página (App.tsx) — repassa o "Atualizar" pra lá.
  useEffect(() => {
    registrar({ atualizadoEm, atualizando, aoAtualizar: carregar });
    return () => registrar({ atualizadoEm: null, atualizando: false, aoAtualizar: null });
  }, [atualizadoEm, atualizando, carregar, registrar]);

  const carregando = sdr.carregando || closer.carregando;
  const erro = !sdr.dado && !closer.dado ? (sdr.erro ?? closer.erro) : null;

  const todasPessoas: PessoaUnificada[] = [
    ...(sdr.dado?.pessoas.map((pessoa) => ({ squad: "sdr" as const, pessoa })) ?? []),
    ...(closer.dado?.pessoas.map((pessoa) => ({ squad: "closer" as const, pessoa })) ?? []),
  ];
  const pessoasVisiveis = squad === "todos" ? todasPessoas : todasPessoas.filter((u) => u.squad === squad);
  const pessoasParaAgregar = pessoasVisiveis.map((u) => u.pessoa);

  const metricasAgregadas = agregarPorMetrica(pessoasParaAgregar);
  const consolidado = agregarConsolidado(pessoasParaAgregar);

  const gaugePct = consolidado.pctGeral === null ? null : Math.round(consolidado.pctGeral * 100);
  const falta = consolidado.metaTotal - consolidado.realizadoTotal;
  const faltamLabel = consolidado.metaTotal === 0 ? "—" : falta > 0 ? formatarNumero(Math.round(falta)) : "Meta batida";

  const fontesGrafico = [
    { squad: "sdr" as const, serieDiaria: sdr.dado?.serie_diaria ?? [], metricas: primeiraComMetricas(sdr.dado) },
    { squad: "closer" as const, serieDiaria: closer.dado?.serie_diaria ?? [], metricas: primeiraComMetricas(closer.dado) },
  ].filter((f) => squad === "todos" || f.squad === squad);

  return (
    <div className="flex flex-col gap-5">
      {carregando ? (
        <p className="text-xl text-fg/60">Carregando…</p>
      ) : erro ? (
        <p className="text-xl text-fg/60" role="alert">
          {erro}
        </p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {metricasAgregadas.map((m) => (
              <CardKpi
                key={m.metrica}
                label={m.nomeExibicao}
                squadTag={squadDaMetrica(m.metrica) === "sdr" ? "SDR" : "CLOSER"}
                value={formatarNumero(m.realizado)}
                meta={m.meta === null ? "—" : formatarNumero(m.meta)}
                pct={m.pct === null ? null : Math.round(m.pct * 100)}
                legenda={m.meta === null ? "Meta não cadastrada" : `${m.pct === null ? 0 : Math.round(m.pct * 100)}% da meta`}
              />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2.15fr)_minmax(272px,1fr)]">
            <GraficoAreaMeta titulo={CHART_TITLE[granularidade]} fontes={fontesGrafico} granularidade={granularidade} />
            <GaugeMeta pct={gaugePct} faltamLabel={faltamLabel} caption={`meta ${RANGE_LABEL_ADJ[granularidade]} ${SQUAD_LABEL[squad]}`} />
          </section>

          <TimeComercialLista pessoas={pessoasVisiveis} granularidade={granularidade} />
        </>
      )}
    </div>
  );
}
