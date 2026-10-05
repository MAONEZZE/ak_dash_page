import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AvisoFontes } from "../componentes/AvisoFontes";
import { Avatar } from "../componentes/Avatar";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { CardKpi } from "../componentes/CardKpi";
import { GraficoAreaMeta } from "../componentes/GraficoAreaMeta";
import { PillSquad } from "../componentes/PillSquad";
import { ProgressBar } from "../componentes/ProgressBar";
import { buscarComercialCloser, buscarComercialSdr } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarNumero, nomeExibicao } from "../lib/formato";
import { agregarPorMetrica, resumoMetas, serieDoTimePorMetrica, type MetricaAgregada } from "../lib/insights";
import { paraPeriodo, useFiltrosAtuais } from "../lib/periodo";
import { calcularRitmo } from "../lib/ritmo";
import { useSomDeAumento } from "../lib/som";
import { useSquadAtual } from "../lib/squad";
import { METRICAS_CLOSER, type Cargo, type DiasUteis, type PessoaComercial, type RespostaComercial } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

/**
 * As 6 métricas de cada cargo, na ordem dos cards e das colunas. As 4 do
 * Dripify (conexoes_enviadas, conexoes_aceitas, abordagens, in_mails) ficam
 * de fora de toda a página — decisão de produto.
 */
const COLUNAS: Record<Cargo, readonly string[]> = {
  sdr: ["fups", "numeros_captados", "inscricoes_realizadas", "ligacoes_realizadas", "indicacoes", "reunioes_agendadas"],
  closer: METRICAS_CLOSER,
};

const ROTULO_CARGO: Record<Cargo, string> = { sdr: "SDR", closer: "Closer" };

interface EstadoBloco {
  dado: RespostaComercial | null;
  carregando: boolean;
  erro: string | null;
}

const ESTADO_INICIAL: EstadoBloco = { dado: null, carregando: true, erro: null };

/** Agregado do time por métrica, só as 6 do cargo e na ordem delas. */
function agregadoDoCargo(dado: RespostaComercial | null, cargo: Cargo): MetricaAgregada[] {
  const agregado = agregarPorMetrica(dado?.pessoas ?? []);
  return COLUNAS[cargo].flatMap((chave) => agregado.find((m) => m.metrica === chave) ?? []);
}

/** Uma casa decimal — média e necessário por dia útil quase nunca são inteiros. */
function umaCasa(valor: number): string {
  return formatarNumero(Math.round(valor * 10) / 10);
}

/** Mesma grade da página, sem conteúdo — ver CardEsqueleto. */
function Esqueleto() {
  return (
    <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <CardEsqueleto key={i} className="min-h-[168px]" />
        ))}
      </section>
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <CardEsqueleto className="min-h-[360px] lg:col-span-2" />
        <CardEsqueleto className="min-h-[360px]" />
      </section>
      <CardEsqueleto className="min-h-[280px]" />
    </>
  );
}

function BlocoCards({ titulo, metricas, dias }: { titulo: string; metricas: MetricaAgregada[]; dias: DiasUteis }) {
  return (
    <section className="flex flex-col gap-3" aria-label={titulo}>
      <h2 className="text-[15px] font-semibold uppercase tracking-[0.13em] text-muted">{titulo}</h2>
      {metricas.length === 0 ? (
        <p className="text-lg text-muted">Nenhum dado lançado neste período.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {metricas.map((m) => (
            <CardKpi
              key={m.metrica}
              label={m.nomeExibicao}
              value={formatarNumero(m.realizado)}
              meta={m.meta === null ? undefined : formatarNumero(m.meta)}
              ritmo={{ realizado: m.realizado, meta: m.meta, dias }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** O que falta por dia útil para a métrica selecionada no gráfico fechar a meta do mês. */
function PainelMeta({ metrica, dias }: { metrica: MetricaAgregada | undefined; dias: DiasUteis | undefined }) {
  const r = metrica && dias ? calcularRitmo(metrica.realizado, metrica.meta, dias) : null;

  return (
    <article className="glass-panel flex flex-col gap-4 rounded-[24px] p-5" aria-label="Para bater a meta">
      <div className="flex flex-col gap-1">
        <h3 className="text-[15px] font-semibold uppercase tracking-[0.13em] text-muted">Para bater a meta</h3>
        {metrica && <span className="text-[17px] font-bold">{metrica.nomeExibicao}</span>}
      </div>
      {!metrica || !r || r.status === "sem_meta" || metrica.meta === null ? (
        <p className="text-[15px] font-semibold text-muted">Nenhuma meta definida no período</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[56px] font-extrabold leading-none tracking-tight">{umaCasa(r.necessarioPorDiaUtil)}</span>
            <span className="text-[17px] font-semibold text-muted">por dia útil</span>
          </div>
          <p className="text-[15px] leading-snug">
            {metrica.realizado >= metrica.meta
              ? `Meta do mês já batida. Média atual: ${umaCasa(r.mediaPorDiaUtil)} por dia útil.`
              : r.mediaPorDiaUtil >= r.necessarioPorDiaUtil
                ? `Média atual: ${umaCasa(r.mediaPorDiaUtil)} por dia útil. Mantendo esse ritmo, a meta fecha.`
                : r.mediaPorDiaUtil === 0
                  ? "Média atual: 0 por dia útil. É preciso acelerar para fechar a meta."
                  : `Média atual: ${umaCasa(r.mediaPorDiaUtil)} por dia útil. É preciso acelerar ${Math.ceil(
                      (r.necessarioPorDiaUtil / r.mediaPorDiaUtil - 1) * 100,
                    )}% para fechar a meta.`}
          </p>
          <dl className="mt-auto grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 border-t border-line pt-3 text-[15px]">
            <dt className="text-muted">Realizado</dt>
            <dd className="text-right font-bold">
              {formatarNumero(metrica.realizado)} / {formatarNumero(metrica.meta)}
            </dd>
            <dt className="text-muted">Faltam</dt>
            <dd className="text-right font-bold">{formatarNumero(Math.max(metrica.meta - metrica.realizado, 0))}</dd>
            <dt className="text-muted">Dias úteis restantes</dt>
            <dd className="text-right font-bold">{formatarNumero(r.diasRestantes)}</dd>
            <dt className="text-muted">Projeção</dt>
            <dd className="text-right font-bold">
              {r.projecao === null
                ? "—"
                : `${formatarNumero(Math.round(r.projecao))} (${Math.round((r.projecao / metrica.meta) * 100)}%)`}
            </dd>
          </dl>
        </>
      )}
    </article>
  );
}

interface TabelaCargoProps {
  cargo: Cargo;
  dado: RespostaComercial;
  destaques: Set<string>;
}

/**
 * Uma tabela por cargo: as 6 métricas + "Metas". Linhas ordenadas pela fração
 * de metas no ritmo; clicar (ou Enter/Espaço) leva pra Time, no card da pessoa
 * (`#pessoa-<email>` — contrato com a página Time). Todo mundo do cargo vira
 * linha: meta 0/sem meta é métrica aberta (valor + barra azul), nunca some.
 */
function TabelaCargo({ cargo, dado, destaques }: TabelaCargoProps) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const colunas = COLUNAS[cargo].map((chave) => ({
    chave,
    nome: dado.pessoas.flatMap((p) => p.metricas).find((m) => m.metrica === chave)?.nome_exibicao ?? chave,
  }));
  const dias = dado.dias_uteis;

  const proporcao = (r: { comMeta: number; noRitmo: number }) => (r.comMeta > 0 ? r.noRitmo / r.comMeta : -1);
  const linhas = dado.pessoas
    .map((pessoa) => ({ pessoa, nome: nomeExibicao(pessoa.nome, pessoa.email), resumo: resumoMetas(pessoa.metricas, COLUNAS[cargo], dias) }))
    .sort((a, b) => proporcao(b.resumo) - proporcao(a.resumo) || a.nome.localeCompare(b.nome, "pt-BR"));

  function abrir(pessoa: PessoaComercial) {
    navigate({ pathname: "/time", search, hash: `#pessoa-${pessoa.email.toLowerCase()}` });
  }

  const titulo = cargo === "sdr" ? "SDRs" : "Closers";

  return (
    <article className="glass-panel flex min-w-0 flex-col gap-3 rounded-[24px] p-5" aria-label={titulo}>
      <h3 className={`text-[15px] font-bold uppercase tracking-[0.13em] ${cargo === "sdr" ? "text-sdr" : "text-closer"}`}>{titulo}</h3>
      {linhas.length === 0 ? (
        <p className="text-[15px] text-muted">Nenhuma pessoa ativa neste cargo.</p>
      ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Pessoa
                  </th>
                  {colunas.map((c) => (
                    <th key={c.chave} scope="col" className="px-3 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {c.nome}
                    </th>
                  ))}
                  <th scope="col" className="py-2 pl-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Metas
                  </th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(({ pessoa, nome, resumo }) => (
                  <tr
                    key={pessoa.id_user}
                    tabIndex={0}
                    onClick={() => abrir(pessoa)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        abrir(pessoa);
                      }
                    }}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2"
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar nome={nome} imagemUrl={pessoa.imagem_url} tamanho={36} />
                        <span className="text-[16px] font-bold">{nome}</span>
                      </div>
                    </td>
                    {colunas.map((c) => {
                      const m = pessoa.metricas.find((x) => x.metrica === c.chave);
                      const subiu = destaques.has(`${pessoa.id_user}:${c.chave}`);
                      const r = m?.meta_periodo ? calcularRitmo(m.realizado, m.meta_periodo, dias) : null;
                      return (
                        <td key={c.chave} className={`px-3 py-3 align-middle ${subiu ? "celula-subiu" : ""}`}>
                          {!m ? (
                            <span className="text-muted">—</span>
                          ) : r && m.meta_periodo ? (
                            <div className="flex flex-col gap-1.5">
                              <span className="whitespace-nowrap font-display text-[17px] font-bold leading-none">
                                {formatarNumero(m.realizado)}
                                <span className="text-[14px] font-semibold text-muted"> / {formatarNumero(m.meta_periodo)}</span>
                              </span>
                              <ProgressBar valor={m.realizado} meta={m.meta_periodo} status={r.status} esperadoFrac={r.esperadoFrac} altura="h-1.5" />
                            </div>
                          ) : (
                            // Meta 0/sem meta: métrica aberta — valor / 0 e barra cheia azul.
                            <div className="flex flex-col gap-1.5">
                              <span className="whitespace-nowrap font-display text-[17px] font-bold leading-none">
                                {formatarNumero(m.realizado)}
                                <span className="text-[14px] font-semibold text-muted"> / 0</span>
                              </span>
                              <ProgressBar valor={m.realizado} meta={0} status="sem_meta" esperadoFrac={0} altura="h-1.5" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap py-3 pl-3 text-[14px]">
                      <span className="block font-bold">
                        {resumo.noRitmo}/{resumo.comMeta} no ritmo
                      </span>
                      <span className="block text-muted">
                        {resumo.batidas} {resumo.batidas === 1 ? "batida" : "batidas"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}
    </article>
  );
}

export function Comercial() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const [sdr, setSdr] = useState<EstadoBloco>(ESTADO_INICIAL);
  const [closer, setCloser] = useState<EstadoBloco>(ESTADO_INICIAL);
  // Gráfico e "Para bater a meta": sempre o mês corrente, nunca o período da pill.
  const [mes, setMes] = useState<{ sdr: RespostaComercial | null; closer: RespostaComercial | null }>({ sdr: null, closer: null });
  const [metricaGrafico, setMetricaGrafico] = useState("");
  // O filtro de função fica na linha do título (querystring `squad`).
  const squad = useSquadAtual();
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const { registrar } = useAtualizacao();

  const mesCorrente = paraPeriodo("mes", new Date());
  // Com a pill já no mês corrente, a série do gráfico veio junto com os dados
  // da página — não vale repetir as duas requisições.
  const filtroEhMesCorrente = granularidade === "mes" && periodo === mesCorrente;

  const carregar = useCallback(async () => {
    setAtualizando(true);
    setSdr((atual) => ({ ...atual, carregando: true }));
    setCloser((atual) => ({ ...atual, carregando: true }));

    const params = { granularidade, periodo };
    const paramsMes = { granularidade: "mes" as const, periodo: mesCorrente };

    // No `catch`, mantém o `dado` já carregado — um refresh que falhou não
    // pode apagar a tela que já estava funcionando.
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
      // Falha aqui não vira erro de página: só o acompanhamento do mês fica sem dado novo.
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

  // Header vive fora da árvore desta página (App.tsx): repassa o "Atualizar" e os dias úteis do período.
  const diasUteis = sdr.dado?.dias_uteis ?? closer.dado?.dias_uteis;
  useEffect(() => {
    registrar({ atualizadoEm, atualizando, aoAtualizar: carregar, diasUteis });
    return () => registrar({ atualizadoEm: null, atualizando: false, aoAtualizar: null });
  }, [atualizadoEm, atualizando, carregar, registrar, diasUteis]);

  // Esqueleto/erro só tomam a tela enquanto não há dado nenhum — depois disso
  // o auto-refresh troca só os valores, sem piscar a página.
  const carregando = (sdr.carregando || closer.carregando) && !sdr.dado && !closer.dado;
  const erro = !sdr.dado && !closer.dado ? (sdr.erro ?? closer.erro) : null;

  const cargosVisiveis: Cargo[] = squad === "todos" ? ["sdr", "closer"] : [squad];
  const porCargo = { sdr, closer };
  const dadoMes: Record<Cargo, RespostaComercial | null> = {
    sdr: filtroEhMesCorrente ? sdr.dado : mes.sdr,
    closer: filtroEhMesCorrente ? closer.dado : mes.closer,
  };

  // Opções do gráfico: as métricas do mês dos cargos visíveis. Quatro métricas
  // existem nos dois cargos, cada um com a sua meta — o id leva o cargo.
  const opcoesGrafico = cargosVisiveis.flatMap((cargo) =>
    agregadoDoCargo(dadoMes[cargo], cargo).map((m) => ({
      id: `${cargo}:${m.metrica}`,
      rotulo: cargosVisiveis.length > 1 ? `${ROTULO_CARGO[cargo]} · ${m.nomeExibicao}` : m.nomeExibicao,
      cargo,
      agregado: m,
    })),
  );
  const selecionada = opcoesGrafico.find((o) => o.id === metricaGrafico) ?? opcoesGrafico[0];
  const respostaMesSelecionada = selecionada ? dadoMes[selecionada.cargo] : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="font-display text-[32px] font-extrabold leading-tight tracking-tight">Comercial</h1>
          <PillSquad />
        </div>
        <p className="text-[14px] font-semibold text-muted">Linha vertical na barra = onde o time deveria estar hoje</p>
      </div>
      <AvisoFontes avisos={[...(sdr.dado?.avisos ?? []), ...(closer.dado?.avisos ?? [])]} />

      {carregando ? (
        <Esqueleto />
      ) : erro ? (
        <p className="text-xl text-muted" role="alert">
          {erro}
        </p>
      ) : (
        <>
          {cargosVisiveis.map((cargo) => {
            const { dado, erro: erroCargo } = porCargo[cargo];
            const titulo = cargo === "sdr" ? "Prospecção · SDRs" : "Fechamento · Closers";
            if (!dado) {
              return (
                <p key={cargo} className="text-lg text-muted" role="alert">
                  {titulo}: {erroCargo ?? "sem dados."}
                </p>
              );
            }
            return <BlocoCards key={cargo} titulo={titulo} metricas={agregadoDoCargo(dado, cargo)} dias={dado.dias_uteis} />;
          })}

          <section className="flex flex-col gap-3" aria-labelledby="titulo-acompanhamento">
            <h2 id="titulo-acompanhamento" className="font-display text-[24px] font-bold tracking-tight">
              Acompanhamento do mês
            </h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="min-w-0 lg:col-span-2">
                <GraficoAreaMeta
                  opcoes={opcoesGrafico}
                  selecionada={selecionada?.id ?? ""}
                  aoSelecionar={setMetricaGrafico}
                  serie={selecionada && respostaMesSelecionada ? serieDoTimePorMetrica(respostaMesSelecionada.serie_diaria, selecionada.agregado.metrica) : []}
                  meta={selecionada?.agregado.meta ?? null}
                  diasUteis={respostaMesSelecionada?.dias_uteis ?? { decorridos: 0, total: 0 }}
                />
              </div>
              <PainelMeta metrica={selecionada?.agregado} dias={respostaMesSelecionada?.dias_uteis} />
            </div>
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="titulo-time">
            <h2 id="titulo-time" className="font-display text-[24px] font-bold tracking-tight">
              Time comercial
            </h2>
            {cargosVisiveis.map((cargo) => {
              const dado = porCargo[cargo].dado;
              return dado && <TabelaCargo key={cargo} cargo={cargo} dado={dado} destaques={destaques} />;
            })}
          </section>
        </>
      )}
    </div>
  );
}
