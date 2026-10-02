import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { Avatar } from "../componentes/Avatar";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { ProgressBar } from "../componentes/ProgressBar";
import { StatusChip } from "../componentes/StatusChip";
import { buscarComercialCloser, buscarComercialSdr } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarNumero, nomeExibicao } from "../lib/formato";
import { useFiltrosAtuais } from "../lib/periodo";
import { calcularRitmo, type Ritmo } from "../lib/ritmo";
import { useSquadAtual } from "../lib/squad";
import { METRICAS_CLOSER, type Cargo, type DiasUteis, type Metrica, type PessoaComercial, type RespostaComercial } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;
const DURACAO_DESTAQUE_MS = 2_400;
const SEM_DIAS: DiasUteis = { decorridos: 0, total: 0 };

/** Ordem fixa das métricas por cargo: todas as do cargo, sem as do Dripify. */
const METRICAS_TIME: Record<Cargo, readonly string[]> = {
  sdr: ["fups", "numeros_captados", "ligacoes_realizadas", "reunioes_agendadas", "indicacoes", "inscricoes_realizadas"],
  closer: METRICAS_CLOSER,
};

const VISUAL_CARGO: Record<Cargo, { rotulo: string; classe: string }> = {
  sdr: { rotulo: "SDR", classe: "bg-ok-bg text-sdr" },
  closer: { rotulo: "Closer", classe: "bg-closer-bg text-closer" },
};

interface EstadoBloco {
  dado: RespostaComercial | null;
  carregando: boolean;
  erro: string | null;
}

const ESTADO_INICIAL: EstadoBloco = { dado: null, carregando: true, erro: null };

interface CargoPessoa {
  cargo: Cargo;
  pessoa: PessoaComercial;
}

/** Mesma pessoa nos dois cargos, num card só. */
interface PessoaTime {
  /** Email em minúsculas — também é o `id="pessoa-…"` que a Comercial usa no link. */
  chave: string;
  cargos: CargoPessoa[];
}

interface MetricaRitmo {
  metrica: Metrica;
  /** `null` = sem meta (meta nula ou 0). */
  meta: number | null;
  ritmo: Ritmo;
}

/**
 * Agrupa por email: o `id_user` muda entre os endpoints de SDR e Closer
 * (contas diferentes da mesma pessoa) e o nome pode colidir. Mantém a ordem
 * de primeira aparição — SDRs primeiro, e dentro do grupo SDR → Closer.
 */
function agruparPorPessoa(unidades: CargoPessoa[]): PessoaTime[] {
  const grupos = new Map<string, PessoaTime>();
  for (const u of unidades) {
    const chave = u.pessoa.email.trim().toLowerCase();
    const grupo = grupos.get(chave);
    if (grupo) grupo.cargos.push(u);
    else grupos.set(chave, { chave, cargos: [u] });
  }
  return [...grupos.values()];
}

function metricasComRitmo({ cargo, pessoa }: CargoPessoa, dias: DiasUteis): MetricaRitmo[] {
  return METRICAS_TIME[cargo].flatMap((chave) =>
    pessoa.metricas
      .filter((m) => m.metrica === chave)
      .map((m) => {
        // Number(): numeric do Postgres pode chegar como string ("0.00") apesar do tipo. Meta 0 = sem meta.
        const meta = m.meta_periodo === null ? null : Number(m.meta_periodo) || null;
        return { metrica: m, meta, ritmo: calcularRitmo(m.realizado, meta, dias) };
      }),
  );
}

function resumo(metricas: MetricaRitmo[]) {
  const comMeta = metricas.filter((m) => m.meta !== null);
  return {
    comMeta: comMeta.length,
    noRitmo: comMeta.filter((m) => m.ritmo.status === "no_ritmo").length,
    batidas: comMeta.filter((m) => m.metrica.realizado >= (m.meta ?? 0)).length,
  };
}

/** Cargo que o card abre: o primeiro com alguma meta (dupla função pode ter meta num cargo só). */
function indicePadrao(grupo: PessoaTime, dias: DiasUteis): number {
  return Math.max(
    0,
    grupo.cargos.findIndex((c) => resumo(metricasComRitmo(c, dias)).comMeta > 0),
  );
}

/**
 * Medidas do card em múltiplos de `--u`. Na TV (>1200px) `--u` vem do tamanho
 * do card, que divide a altura da tela — é o que faz ~6 pessoas caberem em
 * 1920×1080 sem rolagem. Abaixo disso `--u` é 1px e a página rola.
 *
 * NÃO usar `cqh`/`cqw`/`container-type`: o browser da TV é um Chromium 94, sem
 * container queries — ver tests/compat-navegador-antigo.test.ts.
 */
function u(px: number): string {
  return `calc(var(--u) * ${px})`;
}

/** Altura × largura do card com `--u` = 1px — com folga pro chip, que não escala. */
const ALTURA_BASE_CARD = 340;
const LARGURA_BASE_CARD = 560;
/** Cabeçalho do app + paddings do <main> (~175px) e uma margem; é só escala, a grade `1fr` fixa o tamanho real. */
const RESERVA_VERTICAL_PX = 190;
const ALTURA_AVISO_SEM_META_PX = 96;

function variaveisTv(qtdCards: number, comAviso: boolean): CSSProperties {
  const linhas = Math.max(1, Math.ceil(qtdCards / 3));
  const reserva = RESERVA_VERTICAL_PX + (comAviso ? ALTURA_AVISO_SEM_META_PX : 0) + (linhas - 1) * 12;
  return {
    "--card-h": `calc((100vh - ${reserva}px) / ${linhas})`,
    "--card-w": "calc((100vw - 72px) / 3)",
    "--u-tv": `min(calc(var(--card-h) / ${ALTURA_BASE_CARD}), calc(var(--card-w) / ${LARGURA_BASE_CARD}))`,
  } as CSSProperties;
}

function AnelRitmo({ noRitmo, comMeta }: { noRitmo: number; comMeta: number }) {
  const raio = 26;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = comMeta > 0 ? (noRitmo / comMeta) * circunferencia : 0;
  return (
    <div role="img" aria-label={`${noRitmo} de ${comMeta} metas no ritmo`} className="relative shrink-0" style={{ width: u(60), height: u(60) }}>
      <svg viewBox="0 0 60 60" className="h-full w-full" aria-hidden>
        <circle cx={30} cy={30} r={raio} fill="none" strokeWidth={6} className="stroke-track" />
        {preenchido > 0 && (
          <circle
            cx={30}
            cy={30}
            r={raio}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${preenchido} ${circunferencia}`}
            transform="rotate(-90 30 30)"
            className="stroke-brand"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold leading-none" style={{ fontSize: u(16) }}>
        {noRitmo}/{comMeta}
      </span>
    </div>
  );
}

function LinhaMetrica({ metrica, meta, ritmo }: MetricaRitmo) {
  const semMeta = meta === null;
  return (
    <div role="group" aria-label={metrica.nome_exibicao} className="flex min-w-0 flex-col" style={{ gap: u(6) }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate font-semibold uppercase leading-tight tracking-[0.06em] text-muted" style={{ fontSize: u(12) }}>
          {metrica.nome_exibicao}
        </span>
        <span className="shrink-0 font-display font-extrabold leading-none tracking-tight" style={{ fontSize: u(17) }}>
          {formatarNumero(metrica.realizado)}
          <span className="text-muted"> / {semMeta ? "—" : formatarNumero(meta)}</span>
        </span>
      </div>
      {!semMeta && <ProgressBar valor={metrica.realizado} meta={meta} status={ritmo.status} esperadoFrac={ritmo.esperadoFrac} altura="h-1.5" />}
      <div className="flex items-center justify-between gap-2">
        {!semMeta && (
          <span className="truncate text-muted" style={{ fontSize: u(12) }}>
            Esperado hoje: {formatarNumero(Math.round(ritmo.esperadoHoje))}
          </span>
        )}
        <StatusChip status={ritmo.status} className="ml-auto" />
      </div>
    </div>
  );
}

function CardPessoaTime({
  grupo,
  indiceAtivo,
  aoTrocarCargo,
  metricas,
  destacado,
}: {
  grupo: PessoaTime;
  indiceAtivo: number;
  aoTrocarCargo: (indice: number) => void;
  metricas: MetricaRitmo[];
  destacado: boolean;
}) {
  const { cargos } = grupo;
  const { pessoa, cargo } = cargos[indiceAtivo];
  const nome = nomeExibicao(pessoa.nome, pessoa.email);
  // A conta de um cargo pode não ter foto cadastrada: usa a do outro.
  const imagemUrl = pessoa.imagem_url ?? cargos.find((c) => c.pessoa.imagem_url)?.pessoa.imagem_url ?? null;
  const { comMeta, noRitmo, batidas } = resumo(metricas);
  const chipCargo = "rounded-full px-2 py-0.5 font-bold uppercase leading-none tracking-[0.08em]";

  return (
    <article
      id={`pessoa-${grupo.chave}`}
      aria-label={nome}
      className={`glass-panel flex min-w-0 flex-col rounded-[18px] min-[1201px]:min-h-0 min-[1201px]:overflow-hidden ${destacado ? "destaque-temporario" : ""}`}
      style={{ gap: u(16), padding: u(18) }}
    >
      <div className="flex items-center" style={{ gap: u(14) }}>
        <Avatar nome={nome} imagemUrl={imagemUrl} tamanho={u(64)} />
        <div className="flex min-w-0 flex-1 flex-col" style={{ gap: u(5) }}>
          <div className="flex min-w-0 flex-wrap items-center" style={{ gap: u(8) }}>
            <span className="truncate font-display font-extrabold leading-none tracking-tight" style={{ fontSize: u(21) }}>
              {nome}
            </span>
            {cargos.length > 1 ? (
              <div role="group" aria-label="Cargo" className="flex shrink-0 gap-1 rounded-full border border-line p-0.5">
                {cargos.map((c, i) => (
                  <button
                    key={c.cargo}
                    type="button"
                    aria-pressed={i === indiceAtivo}
                    onClick={() => aoTrocarCargo(i)}
                    className={`${chipCargo} ${i === indiceAtivo ? VISUAL_CARGO[c.cargo].classe : "text-muted"}`}
                    style={{ fontSize: u(11) }}
                  >
                    {VISUAL_CARGO[c.cargo].rotulo}
                  </button>
                ))}
              </div>
            ) : (
              <span className={`shrink-0 ${chipCargo} ${VISUAL_CARGO[cargo].classe}`} style={{ fontSize: u(11) }}>
                {VISUAL_CARGO[cargo].rotulo}
              </span>
            )}
          </div>
          <span className="truncate text-muted" style={{ fontSize: u(13) }}>
            {batidas} {batidas === 1 ? "meta batida" : "metas batidas"} · {noRitmo} no ritmo
          </span>
        </div>
        <AnelRitmo noRitmo={noRitmo} comMeta={comMeta} />
      </div>
      {/* Duas colunas na TV: o card tem mais largura que altura sobrando. */}
      <div className="grid grid-cols-1 min-[1201px]:grid-cols-2" style={{ columnGap: u(20), rowGap: u(14) }}>
        {metricas.map((m) => (
          <LinhaMetrica key={m.metrica.metrica} {...m} />
        ))}
      </div>
    </article>
  );
}

const MES_EXTENSO = new Intl.DateTimeFormat("pt-BR", { month: "long" });
const LISTA_NOMES = new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" });

function mesPorExtenso(inicioIso: string): string {
  const [ano, mes] = inicioIso.split("-").map(Number);
  return MES_EXTENSO.format(new Date(ano, mes - 1, 1));
}

function AvisoSemMeta({ grupos, mes }: { grupos: PessoaTime[]; mes: string }) {
  const nomes = grupos.map((g) => nomeExibicao(g.cargos[0].pessoa.nome, g.cargos[0].pessoa.email));
  return (
    <section aria-label="Pessoas sem meta" className="glass-panel flex shrink-0 items-center gap-4 rounded-[18px] px-5 py-4">
      <div className="flex shrink-0">
        {grupos.map((g, i) => {
          const imagemUrl = g.cargos.find((c) => c.pessoa.imagem_url)?.pessoa.imagem_url ?? null;
          return (
            <span key={g.chave} className={`flex rounded-full ring-2 ring-surface ${i > 0 ? "-ml-3" : ""}`}>
              <Avatar nome={nomes[i]} imagemUrl={imagemUrl} tamanho={40} />
            </span>
          );
        })}
      </div>
      <p className="text-[15px] text-muted">
        <span className="font-semibold text-fg">{LISTA_NOMES.format(nomes)}</span> {nomes.length === 1 ? "está" : "estão"} sem meta em {mes}. Defina
        as metas para que apareçam no acompanhamento.
      </p>
    </section>
  );
}

/** Rola até o card de `#pessoa-…` (link da Comercial) e devolve a chave a destacar por ~2,4s. */
function useDestaqueDoHash(chavesRenderizadas: string): string | null {
  const { hash } = useLocation();
  const hashTratado = useRef<string | null>(null);
  const [destacado, setDestacado] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) {
      hashTratado.current = null;
      return;
    }
    if (hashTratado.current === hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const el = document.getElementById(id);
    if (!el) return;
    hashTratado.current = hash;
    const reduzir = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView(reduzir ? { block: "center" } : { block: "center", behavior: "smooth" });
    setDestacado(id.replace(/^pessoa-/, ""));
  }, [hash, chavesRenderizadas]);

  useEffect(() => {
    if (!destacado) return;
    const timer = setTimeout(() => setDestacado(null), DURACAO_DESTAQUE_MS);
    return () => clearTimeout(timer);
  }, [destacado]);

  return destacado;
}

export function Time() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const [sdr, setSdr] = useState<EstadoBloco>(ESTADO_INICIAL);
  const [closer, setCloser] = useState<EstadoBloco>(ESTADO_INICIAL);
  const squad = useSquadAtual();
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  /** Cargo escolhido no toggle de quem tem dupla função, por chave da pessoa. */
  const [cargoEscolhido, setCargoEscolhido] = useState<Record<string, number>>({});
  const { registrar } = useAtualizacao();

  const carregar = useCallback(async () => {
    setAtualizando(true);
    setSdr((atual) => ({ ...atual, carregando: true }));
    setCloser((atual) => ({ ...atual, carregando: true }));

    const params = { granularidade, periodo };

    // Mesmo contrato da Comercial: refresh que falhou mantém o `dado` anterior.
    await Promise.all([
      buscarComercialSdr(params)
        .then((dado) => setSdr({ dado, carregando: false, erro: null }))
        .catch((erro: unknown) =>
          setSdr((atual) => ({
            ...atual,
            carregando: false,
            erro: erro instanceof Error ? erro.message : "Falha ao carregar SDRs.",
          })),
        ),
      buscarComercialCloser(params)
        .then((dado) => setCloser({ dado, carregando: false, erro: null }))
        .catch((erro: unknown) =>
          setCloser((atual) => ({
            ...atual,
            carregando: false,
            erro: erro instanceof Error ? erro.message : "Falha ao carregar Closers.",
          })),
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

  const diasUteis = sdr.dado?.dias_uteis ?? closer.dado?.dias_uteis;

  useEffect(() => {
    registrar({ atualizadoEm, atualizando, aoAtualizar: carregar, diasUteis });
    return () => registrar({ atualizadoEm: null, atualizando: false, aoAtualizar: null });
  }, [atualizadoEm, atualizando, carregar, registrar, diasUteis]);

  const dias = diasUteis ?? SEM_DIAS;
  const unidades: CargoPessoa[] = [
    ...(sdr.dado?.pessoas.map((pessoa) => ({ cargo: "sdr" as const, pessoa })) ?? []),
    ...(closer.dado?.pessoas.map((pessoa) => ({ cargo: "closer" as const, pessoa })) ?? []),
  ];
  const grupos = agruparPorPessoa(squad === "todos" ? unidades : unidades.filter((u) => u.cargo === squad));
  const semMeta = grupos.filter((g) => g.cargos.every((c) => resumo(metricasComRitmo(c, dias)).comMeta === 0));
  const cards = grupos
    .filter((g) => !semMeta.includes(g))
    .map((grupo) => {
      const indiceAtivo = Math.min(cargoEscolhido[grupo.chave] ?? indicePadrao(grupo, dias), grupo.cargos.length - 1);
      const metricas = metricasComRitmo(grupo.cargos[indiceAtivo], dias);
      const { comMeta, noRitmo } = resumo(metricas);
      return { grupo, indiceAtivo, metricas, proporcao: comMeta > 0 ? noRitmo / comMeta : -1 };
    })
    .sort((a, b) => b.proporcao - a.proporcao);

  const destacado = useDestaqueDoHash(cards.map((c) => c.grupo.chave).join(","));

  const carregando = (sdr.carregando || closer.carregando) && !sdr.dado && !closer.dado;
  const erro = !sdr.dado && !closer.dado ? (sdr.erro ?? closer.erro) : null;

  if (carregando) {
    return (
      <div className="grid grid-cols-1 gap-3 min-[761px]:grid-cols-2 min-[1201px]:h-full min-[1201px]:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <CardEsqueleto key={i} className="min-h-[320px]" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <p className="text-xl text-muted" role="alert">
        {erro}
      </p>
    );
  }

  if (grupos.length === 0) {
    return <p className="text-xl text-muted">Nenhuma pessoa com dado lançado neste período.</p>;
  }

  const periodoResposta = (sdr.dado ?? closer.dado)?.periodo;
  const inicioPeriodo = periodoResposta?.inicio ?? `${periodo.slice(0, 7)}-01`;
  // Sob Ano o início é 1º de janeiro: o aviso cita o ano, como na Comercial.
  const referencia = periodoResposta?.granularidade === "ano" ? inicioPeriodo.slice(0, 4) : mesPorExtenso(inicioPeriodo);

  return (
    <div
      className="flex flex-col gap-3 [--u:1px] min-[1201px]:h-full min-[1201px]:[--u:var(--u-tv)]"
      style={variaveisTv(cards.length, semMeta.length > 0)}
    >
      {cards.length > 0 && (
        <section
          aria-label="Time"
          className="grid grid-cols-1 gap-3 min-[761px]:grid-cols-2 min-[1201px]:min-h-0 min-[1201px]:flex-1 min-[1201px]:auto-rows-[minmax(0,1fr)] min-[1201px]:grid-cols-3"
        >
          {cards.map(({ grupo, indiceAtivo, metricas }) => (
            <CardPessoaTime
              key={grupo.chave}
              grupo={grupo}
              indiceAtivo={indiceAtivo}
              metricas={metricas}
              destacado={destacado === grupo.chave}
              aoTrocarCargo={(i) => setCargoEscolhido((atual) => ({ ...atual, [grupo.chave]: i }))}
            />
          ))}
        </section>
      )}
      {semMeta.length > 0 && <AvisoSemMeta grupos={semMeta} mes={referencia} />}
    </div>
  );
}
