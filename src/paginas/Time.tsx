import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Avatar } from "../componentes/Avatar";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { ESTILO_HACHURA, estadoVisual, metaTexto, type PessoaUnificada } from "../componentes/TimeComercialLista";
import { buscarComercialCloser, buscarComercialSdr } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarNumero, nomeExibicao } from "../lib/formato";
import { useFiltrosAtuais } from "../lib/periodo";
import { useSquadAtual } from "../lib/squad";
import type { Metrica, RespostaComercial } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

/** Ordem fixa das barras. Cada cargo só tem parte delas (SDR: 2, Closer: 3) — o card mostra só as que a pessoa tem. */
const METRICAS_TIME = ["ligacoes_agendadas", "ligacoes_realizadas", "reunioes_agendadas", "reunioes_realizadas"];

interface EstadoBloco {
  dado: RespostaComercial | null;
  carregando: boolean;
  erro: string | null;
}

const ESTADO_INICIAL: EstadoBloco = {
  dado: null,
  carregando: true,
  erro: null,
};

function metricasDoTime(metricas: Metrica[]): Metrica[] {
  return METRICAS_TIME.flatMap((chave) => metricas.filter((m) => m.metrica === chave));
}

/** Uma coluna até 4 pessoas; acima disso, duas — as linhas dividem a altura da tela igualmente. */
function grade(qtd: number): { colunas: number; linhas: number } {
  const colunas = qtd > 4 ? 2 : 1;
  return { colunas, linhas: Math.max(1, Math.ceil(qtd / colunas)) };
}

/**
 * Medida proporcional ao card: `min(altura × a, largura × l)`. A altura e a
 * largura do card vêm de `--card-h`/`--card-w` (em vh/vw, definidas na grade
 * abaixo), então foto, texto e barras crescem com o espaço que cada card tem.
 *
 * NÃO usar `cqh`/`cqw`/`container-type`: o browser da TV é um Chromium 94, sem
 * container queries — ver tests/compat-navegador-antigo.test.ts.
 */
function medida(a: number, l: number): string {
  return `min(calc(var(--card-h) * ${a}), calc(var(--card-w) * ${l}))`;
}

/**
 * A barra vai até 125% da meta, então o traço da meta fica em 80% da largura e
 * sobra espaço pra mostrar quem passou dela.
 */
const ESCALA_BARRA = 1.25;
const POSICAO_META = 100 / ESCALA_BARRA;

type Faixa = "baixa" | "media" | "alta";
const COR_FAIXA: Record<Faixa, string> = {
  baixa: "bg-perigo",
  media: "bg-atencao",
  alta: "bg-status-good",
};

/** Abaixo de 50% da meta é baixa, até a meta é média, bateu ou passou é alta. */
function faixa(proporcao: number): Faixa {
  if (proporcao >= 1) return "alta";
  return proporcao >= 0.5 ? "media" : "baixa";
}

const ROTULO_CARGO: Record<PessoaUnificada["squad"], string> = {
  sdr: "SDR",
  closer: "Closer",
};

/** Mesma pessoa nos dois cargos, num card só. */
interface PessoaTime {
  chave: string;
  cargos: PessoaUnificada[];
}

/**
 * Agrupa por email: o `id_user` muda entre os endpoints de SDR e Closer
 * (contas diferentes da mesma pessoa) e o nome pode colidir. Mantém a ordem
 * de primeira aparição — SDRs primeiro, e dentro do grupo SDR → Closer.
 */
function agruparPorPessoa(unidades: PessoaUnificada[]): PessoaTime[] {
  const grupos = new Map<string, PessoaTime>();
  for (const u of unidades) {
    const chave = u.pessoa.email.trim().toLowerCase();
    const grupo = grupos.get(chave);
    if (grupo) grupo.cargos.push(u);
    else grupos.set(chave, { chave, cargos: [u] });
  }
  return [...grupos.values()];
}

function CardPessoaTime({ grupo }: { grupo: PessoaTime }) {
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const { cargos } = grupo;
  const { pessoa, squad } = cargos[indiceAtivo] ?? cargos[0];
  const nome = nomeExibicao(pessoa.nome, pessoa.email);
  const imagemUrl = pessoa.imagem_url ?? cargos.find((c) => c.pessoa.imagem_url)?.pessoa.imagem_url ?? null;
  const metricas = metricasDoTime(pessoa.metricas);
  const alturaBarra = medida(0.05, 0.016);
  const fonteCargo = medida(0.065, 0.022);

  return (
    <div
      className="glass-panel flex min-h-0 min-w-0 items-center overflow-hidden rounded-2xl"
      style={{ gap: medida(0.06, 0.025), padding: medida(0.07, 0.025) }}
    >
      <Avatar nome={nome} imagemUrl={imagemUrl} tamanho={medida(0.8, 0.28)} />
      <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ gap: medida(0.05, 0.016) }}>
        <div className="flex min-w-0 items-center" style={{ gap: medida(0.03, 0.012) }}>
          <span className="truncate font-display font-extrabold leading-none tracking-tight" style={{ fontSize: medida(0.13, 0.044) }}>
            {nome}
          </span>
          {cargos.length > 1 ? (
            <div role="group" aria-label="Cargo" className="flex shrink-0 rounded-full border border-border-2 bg-glass-bg p-0.5">
              {cargos.map((c, i) => (
                <button
                  key={c.squad}
                  type="button"
                  aria-pressed={i === indiceAtivo}
                  onClick={() => setIndiceAtivo(i)}
                  className={`rounded-full px-3 py-1 font-semibold uppercase leading-none tracking-[0.1em] transition-colors ${
                    i === indiceAtivo ? "bg-glass-border text-accent-fg" : "text-fg/50"
                  }`}
                  style={{ fontSize: fonteCargo }}
                >
                  {ROTULO_CARGO[c.squad]}
                </button>
              ))}
            </div>
          ) : (
            <span className="shrink-0 font-semibold uppercase leading-none tracking-[0.1em] text-fg/50" style={{ fontSize: fonteCargo }}>
              {ROTULO_CARGO[squad]}
            </span>
          )}
        </div>
        {metricas.length === 0 && (
          <span className="text-fg/55" style={{ fontSize: medida(0.07, 0.024) }}>
            Sem métricas de ligação ou reunião.
          </span>
        )}
        {metricas.map((m) => {
          // Meta 0 é meta cadastrada (só não exige nada): barra normal, cheia assim que houver qualquer lançamento.
          // Number(): numeric do Postgres pode chegar como string ("0.00") apesar do tipo.
          const meta = m.meta_periodo === null ? null : Number(m.meta_periodo);
          const metaZero = meta === 0;
          const barraNormal = estadoVisual(m) === "ok" || metaZero;
          const bateu = m.status === "atingido" || (metaZero && m.realizado > 0);
          const proporcao = meta !== null && meta > 0 ? m.realizado / meta : bateu ? ESCALA_BARRA : 0;
          const pct = (Math.min(proporcao, ESCALA_BARRA) / ESCALA_BARRA) * 100;
          return (
            <div key={m.metrica} className="flex flex-col" style={{ gap: medida(0.016, 0.006) }}>
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className="truncate font-semibold uppercase leading-none tracking-[0.08em] text-fg/55"
                  style={{ fontSize: medida(0.065, 0.022) }}
                >
                  {m.nome_exibicao}
                </span>
                <span
                  className={`shrink-0 font-display font-extrabold leading-none tracking-tight ${bateu ? "text-accent-fg" : "text-fg"}`}
                  style={{ fontSize: medida(0.09, 0.032) }}
                >
                  {formatarNumero(m.realizado)}
                  <span className="text-fg/45"> / {metaTexto(m)}</span>
                </span>
              </div>
              {barraNormal ? (
                <div className="relative">
                  <div className="overflow-hidden rounded-full bg-progress-track" style={{ height: alturaBarra }} data-testid={`barra-${m.metrica}`}>
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ${COR_FAIXA[bateu ? "alta" : faixa(proporcao)]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {!metaZero && (
                    <div
                      className="absolute rounded-full bg-fg"
                      style={{
                        left: `${POSICAO_META}%`,
                        top: "-35%",
                        bottom: "-35%",
                        width: medida(0.012, 0.004),
                        transform: "translateX(-50%)",
                      }}
                      data-testid={`meta-${m.metrica}`}
                      aria-hidden
                    />
                  )}
                </div>
              ) : (
                <div className="rounded-full" style={{ ...ESTILO_HACHURA, height: alturaBarra }} data-testid={`barra-${m.metrica}`} aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Tamanho aproximado de cada card: a tela menos o header e os paddings
 * (~140px na vertical, 48px na horizontal) e os gaps de 12px da grade. É só a
 * escala do conteúdo — quem fixa o tamanho real é a grade `1fr`, então errar
 * por alguns px não quebra o layout.
 */
function variaveisCard(colunas: number, linhas: number): CSSProperties {
  return {
    "--card-h": `calc((100vh - 140px - ${(linhas - 1) * 12}px) / ${linhas})`,
    "--card-w": `calc((100vw - 48px - ${(colunas - 1) * 12}px) / ${colunas})`,
  } as CSSProperties;
}

export function Time() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const [sdr, setSdr] = useState<EstadoBloco>(ESTADO_INICIAL);
  const [closer, setCloser] = useState<EstadoBloco>(ESTADO_INICIAL);
  const squad = useSquadAtual();
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
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

  useEffect(() => {
    registrar({ atualizadoEm, atualizando, aoAtualizar: carregar });
    return () => registrar({ atualizadoEm: null, atualizando: false, aoAtualizar: null });
  }, [atualizadoEm, atualizando, carregar, registrar]);

  const carregando = (sdr.carregando || closer.carregando) && !sdr.dado && !closer.dado;
  const erro = !sdr.dado && !closer.dado ? (sdr.erro ?? closer.erro) : null;

  const todasPessoas: PessoaUnificada[] = [
    ...(sdr.dado?.pessoas.map((pessoa) => ({
      squad: "sdr" as const,
      pessoa,
    })) ?? []),
    ...(closer.dado?.pessoas.map((pessoa) => ({
      squad: "closer" as const,
      pessoa,
    })) ?? []),
  ];
  const pessoas = agruparPorPessoa(squad === "todos" ? todasPessoas : todasPessoas.filter((u) => u.squad === squad));

  if (carregando) {
    return (
      <div className="grid h-full grid-rows-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <CardEsqueleto key={i} className="min-h-0" />
        ))}
      </div>
    );
  }

  if (erro) {
    return (
      <p className="text-xl text-fg/60" role="alert">
        {erro}
      </p>
    );
  }

  if (pessoas.length === 0) {
    return <p className="text-xl text-fg/60">Nenhuma pessoa com dado lançado neste período.</p>;
  }

  const { colunas, linhas } = grade(pessoas.length);

  return (
    <section
      aria-label="Time"
      className="grid h-full gap-3"
      style={{
        ...variaveisCard(colunas, linhas),
        gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${linhas}, minmax(0, 1fr))`,
      }}
    >
      {pessoas.map((g) => (
        <CardPessoaTime key={g.chave} grupo={g} />
      ))}
    </section>
  );
}
