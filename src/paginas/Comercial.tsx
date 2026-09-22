import { useCallback, useEffect, useState } from "react";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { CardKpi } from "../componentes/CardKpi";
import { GaugeMeta } from "../componentes/GaugeMeta";
import { GraficoAreaMeta } from "../componentes/GraficoAreaMeta";
import { TimeComercialLista, type PessoaUnificada } from "../componentes/TimeComercialLista";
import { buscarComercialCloser, buscarComercialSdr } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarNumero } from "../lib/formato";
import { agregarConsolidado, agregarPorMetrica } from "../lib/insights";
import { paraPeriodo, useFiltrosAtuais } from "../lib/periodo";
import { useSomDeAumento } from "../lib/som";
import { useSquadAtual, type Squad } from "../lib/squad";
import type { Granularidade, Metrica, PessoaComercial, RespostaComercial } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

interface EstadoBloco {
  dado: RespostaComercial | null;
  carregando: boolean;
  erro: string | null;
}

const ESTADO_INICIAL: EstadoBloco = { dado: null, carregando: true, erro: null };

const RANGE_LABEL_ADJ: Record<Granularidade, string> = { dia: "diária", semana: "semanal", mes: "mensal", ano: "anual" };

/** O gráfico é fixo no mês corrente — o título não acompanha mais a pill de período. */
const TITULO_GRAFICO = "Dias do mês atual";

const SQUAD_LABEL: Record<Squad, string> = { todos: "do time", sdr: "dos SDRs", closer: "dos closers" };

/**
 * Métricas de prospecção do LinkedIn (origem Dripify) que não aparecem em lugar
 * nenhum desta página — decisão de produto. O corte é aqui, no topo: cards,
 * gauge, gráfico e lista do time comem todos da mesma lista já filtrada.
 */
const METRICAS_OCULTAS = new Set(["conexoes_enviadas", "conexoes_aceitas", "abordagens", "in_mails"]);

function visiveis(metricas: Metrica[]): Metrica[] {
  return metricas.filter((m) => !METRICAS_OCULTAS.has(m.metrica));
}

/** `metas_atingidas` vem do BFF contando todas as métricas do cargo — recontar mantém o "x/y metas batidas" igual ao que está na tela. */
function semMetricasOcultas(pessoas: PessoaComercial[]): PessoaComercial[] {
  return pessoas.map((pessoa) => {
    const metricas = visiveis(pessoa.metricas);
    return {
      ...pessoa,
      metricas,
      metas_atingidas: {
        atingidas: metricas.filter((m) => m.status === "atingido").length,
        total: metricas.length,
      },
    };
  });
}

function primeiraComMetricas(dado: RespostaComercial | null): Metrica[] {
  return visiveis(dado?.pessoas.find((p) => visiveis(p.metricas).length > 0)?.metricas ?? []);
}

/** Mesma grade da página, sem conteúdo — ver CardEsqueleto. */
function Esqueleto() {
  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <CardEsqueleto key={i} className="min-h-[168px]" />
        ))}
      </section>
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2.15fr)_minmax(272px,1fr)]">
        <CardEsqueleto className="min-h-[320px]" />
        <CardEsqueleto className="min-h-[320px]" />
      </section>
      <CardEsqueleto className="min-h-[280px]" />
    </>
  );
}

export function Comercial() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const [sdr, setSdr] = useState<EstadoBloco>(ESTADO_INICIAL);
  const [closer, setCloser] = useState<EstadoBloco>(ESTADO_INICIAL);
  // Série do gráfico: sempre o mês corrente, nunca o período da pill.
  const [mes, setMes] = useState<{ sdr: RespostaComercial | null; closer: RespostaComercial | null }>({ sdr: null, closer: null });
  // O filtro de squad vive no header, à direita do período — a página só lê.
  const squad = useSquadAtual();
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const { registrar } = useAtualizacao();

  const mesCorrente = paraPeriodo("mes", new Date());
  // Quando a pill já está no mês corrente, a série do gráfico veio junto com os
  // dados da página — não vale repetir as duas requisições.
  const filtroEhMesCorrente = granularidade === "mes" && periodo === mesCorrente;

  const carregar = useCallback(async () => {
    setAtualizando(true);
    setSdr((atual) => ({ ...atual, carregando: true }));
    setCloser((atual) => ({ ...atual, carregando: true }));

    const params = { granularidade, periodo };
    const paramsMes = { granularidade: "mes" as const, periodo: mesCorrente };

    // No `catch`, mantém o `dado` já carregado — um refresh que falhou não
    // pode apagar a tela que já estava funcionando (ver guard de render abaixo).
    await Promise.all([
      buscarComercialSdr(params)
        .then((dado) => setSdr({ dado, carregando: false, erro: null }))
        .catch((erro: unknown) =>
          setSdr((atual) => ({ ...atual, carregando: false, erro: erro instanceof Error ? erro.message : "Falha ao carregar SDRs." })),
        ),
      buscarComercialCloser(params)
        .then((dado) => setCloser({ dado, carregando: false, erro: null }))
        .catch((erro: unknown) =>
          setCloser((atual) => ({ ...atual, carregando: false, erro: erro instanceof Error ? erro.message : "Falha ao carregar Closers." })),
        ),
      // Falha aqui não vira erro de página: só o gráfico fica sem série nova,
      // o resto da tela continua valendo.
      ...(filtroEhMesCorrente
        ? []
        : [
            buscarComercialSdr(paramsMes)
              .then((dado) => setMes((atual) => ({ ...atual, sdr: dado })))
              .catch(() => undefined),
            buscarComercialCloser(paramsMes)
              .then((dado) => setMes((atual) => ({ ...atual, closer: dado })))
              .catch(() => undefined),
          ]),
    ]);

    setAtualizadoEm(new Date());
    setAtualizando(false);
  }, [granularidade, periodo, mesCorrente, filtroEhMesCorrente]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, INTERVALO_AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [carregar]);

  // Nathan e Jennifer são os dois SDRs vigiados — não tem por que olhar o bloco de Closer.
  const { destaques } = useSomDeAumento({ pessoas: sdr.dado?.pessoas, granularidade, periodo });

  // Header vive fora da árvore desta página (App.tsx) — repassa o "Atualizar" pra lá.
  useEffect(() => {
    registrar({ atualizadoEm, atualizando, aoAtualizar: carregar });
    return () => registrar({ atualizadoEm: null, atualizando: false, aoAtualizar: null });
  }, [atualizadoEm, atualizando, carregar, registrar]);

  // Só toma a tela inteira (esqueleto/erro) quando ainda não há dado
  // nenhum — depois da primeira carga, o auto-refresh de 60s troca só os
  // valores, sem piscar a página inteira.
  const carregando = (sdr.carregando || closer.carregando) && !sdr.dado && !closer.dado;
  const erro = !sdr.dado && !closer.dado ? (sdr.erro ?? closer.erro) : null;

  const todasPessoas: PessoaUnificada[] = [
    ...(sdr.dado ? semMetricasOcultas(sdr.dado.pessoas).map((pessoa) => ({ squad: "sdr" as const, pessoa })) : []),
    ...(closer.dado ? semMetricasOcultas(closer.dado.pessoas).map((pessoa) => ({ squad: "closer" as const, pessoa })) : []),
  ];
  const pessoasVisiveis = squad === "todos" ? todasPessoas : todasPessoas.filter((u) => u.squad === squad);
  const pessoasParaAgregar = pessoasVisiveis.map((u) => u.pessoa);

  const metricasAgregadas = agregarPorMetrica(pessoasParaAgregar);
  const consolidado = agregarConsolidado(pessoasParaAgregar);

  const gaugePct = consolidado.pctGeral === null ? null : Math.round(consolidado.pctGeral * 100);
  const falta = consolidado.metaTotal - consolidado.realizadoTotal;
  const faltamLabel = consolidado.metaTotal === 0 ? "—" : falta > 0 ? formatarNumero(Math.round(falta)) : "Meta batida";

  const dadoMesSdr = filtroEhMesCorrente ? sdr.dado : mes.sdr;
  const dadoMesCloser = filtroEhMesCorrente ? closer.dado : mes.closer;
  const fontesGrafico = [
    { squad: "sdr" as const, serieDiaria: dadoMesSdr?.serie_diaria ?? [], metricas: primeiraComMetricas(dadoMesSdr) },
    { squad: "closer" as const, serieDiaria: dadoMesCloser?.serie_diaria ?? [], metricas: primeiraComMetricas(dadoMesCloser) },
  ].filter((f) => squad === "todos" || f.squad === squad);

  return (
    <div className="flex flex-col gap-5">
      {carregando ? (
        <Esqueleto />
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
                value={formatarNumero(m.realizado)}
                meta={m.meta === null ? "—" : formatarNumero(m.meta)}
                pct={m.pct === null ? null : Math.round(m.pct * 100)}
                legenda={m.meta === null ? "Meta não cadastrada" : `${m.pct === null ? 0 : Math.round(m.pct * 100)}% da meta`}
              />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2.15fr)_minmax(272px,1fr)]">
            <GraficoAreaMeta titulo={TITULO_GRAFICO} fontes={fontesGrafico} />
            <GaugeMeta pct={gaugePct} faltamLabel={faltamLabel} caption={`meta ${RANGE_LABEL_ADJ[granularidade]} ${SQUAD_LABEL[squad]}`} />
          </section>

          <TimeComercialLista pessoas={pessoasVisiveis} granularidade={granularidade} destaques={destaques} />
        </>
      )}
    </div>
  );
}
