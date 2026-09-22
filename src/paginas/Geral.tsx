import { useCallback, useEffect, useState } from "react";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { CardEventoRotativo } from "../componentes/CardEventoRotativo";
import { CardKpi } from "../componentes/CardKpi";
import { RankingPodio } from "../componentes/RankingPodio";
import { TabelaPessoas } from "../componentes/TabelaPessoas";
import { buscarGeral } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarMoeda, formatarNumero, METRICAS_EM_MOEDA } from "../lib/formato";
import { useFiltrosAtuais } from "../lib/periodo";
import { useSomDeAumento } from "../lib/som";
import type { CardGeral, RespostaGeral } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

const GRADE_CARDS = "grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4";
const GRADE_RODAPE =
  "grid min-h-0 flex-[0.6_1_auto] grid-cols-1 grid-rows-[minmax(0,1fr)] items-stretch gap-2 sm:grid-cols-3 lg:grid-cols-4";

interface EstadoGeral {
  dado: RespostaGeral | null;
  carregando: boolean;
  erro: string | null;
}

const ESTADO_INICIAL: EstadoGeral = { dado: null, carregando: true, erro: null };

function valorCard(c: CardGeral): string {
  if (c.realizado === null) return "—";
  return METRICAS_EM_MOEDA.has(c.metrica) ? formatarMoeda(c.realizado) : formatarNumero(c.realizado);
}

function metaCard(c: CardGeral): string {
  if (c.meta === null) return "—";
  return METRICAS_EM_MOEDA.has(c.metrica) ? formatarMoeda(c.meta) : formatarNumero(c.meta);
}

function legendaCard(c: CardGeral): string {
  if (c.meta === null) return "Meta não cadastrada";
  if (c.pct_ritmo !== null) return `${Math.round(c.pct_ritmo)}% do ritmo`;
  return `${c.pct === null ? 0 : Math.round(c.pct)}% da meta`;
}

/**
 * Reconstrução da página Geral: 8 cards (2 escuros de faturamento + 2 escuros
 * dos próximos eventos + 4 claros de métricas), tabela de 7 pessoas e dois
 * pódios (SDR/Closer). Cabe numa tela só, sem rolagem: a linha de baixo
 * (tabela + pódios) fica na altura mínima do conteúdo e as duas linhas de card
 * dividem entre si todo o resto da tela — por isso a tipografia dos cards é em
 * vh, pra crescer junto.
 */
/** Mesma grade da página, sem conteúdo — ver CardEsqueleto. */
function Esqueleto() {
  return (
    <>
      <section className={GRADE_CARDS}>
        {Array.from({ length: 4 }, (_, i) => (
          <CardEsqueleto key={i} className="h-full min-h-[104px]" />
        ))}
      </section>
      <section className={GRADE_CARDS}>
        {Array.from({ length: 4 }, (_, i) => (
          <CardEsqueleto key={i} className="h-full min-h-[104px]" />
        ))}
      </section>
      <section className={GRADE_RODAPE}>
        <div className="min-h-0 min-w-0 sm:col-span-2 lg:col-span-3">
          <CardEsqueleto className="h-full" />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col gap-2">
          <CardEsqueleto className="flex-1" />
          <CardEsqueleto className="flex-1" />
        </div>
      </section>
    </>
  );
}

export function Geral() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const [estado, setEstado] = useState<EstadoGeral>(ESTADO_INICIAL);
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const { registrar } = useAtualizacao();

  const carregar = useCallback(async () => {
    setAtualizando(true);
    setEstado((atual) => ({ ...atual, carregando: true }));
    try {
      const dado = await buscarGeral({ granularidade, periodo });
      setEstado({ dado, carregando: false, erro: null });
    } catch (erro: unknown) {
      // Mantém o `dado` já carregado — um refresh que falhou não apaga a
      // tela que já estava funcionando.
      setEstado((atual) => ({
        ...atual,
        carregando: false,
        erro: erro instanceof Error ? erro.message : "Falha ao carregar a visão geral.",
      }));
    }
    setAtualizadoEm(new Date());
    setAtualizando(false);
  }, [granularidade, periodo]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, INTERVALO_AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [carregar]);

  const { destaques } = useSomDeAumento({ pessoas: estado.dado?.pessoas, granularidade, periodo });

  // O "Atualizar" virou item do menu do header, que vive fora da árvore da página.
  useEffect(() => {
    registrar({ atualizadoEm, atualizando, aoAtualizar: carregar });
    return () => registrar({ atualizadoEm: null, atualizando: false, aoAtualizar: null });
  }, [atualizadoEm, atualizando, carregar, registrar]);

  const cardsEscuros = estado.dado?.cards.filter((c) => c.escuro) ?? [];
  // Inscritos/Aprovados não são card de período: giram entre os próximos eventos.
  const eventos = estado.dado?.eventos ?? [];
  const cardsClaros = estado.dado?.cards.filter((c) => !c.escuro) ?? [];
  const sdrs = estado.dado?.pessoas.filter((p) => p.cargo === "sdr") ?? [];
  const closers = estado.dado?.pessoas.filter((p) => p.cargo === "closer") ?? [];

  // Esqueleto/erro só tomam a tela inteira enquanto não há `dado` nenhum
  // (primeira carga) — mesmo guard da Financeiro e da Comercial. Depois disso a
  // tela continua mostrando os últimos dados bons até os novos chegarem: uma
  // troca de filtro ou um refresh de 60s que falhou não troca o dashboard por
  // uma linha de texto de erro.
  return (
    <div className="flex h-full flex-col gap-2 overflow-hidden">
      {estado.carregando && !estado.dado ? (
        <Esqueleto />
      ) : estado.erro && !estado.dado ? (
        <p className="text-xl text-fg/60" role="alert">
          {estado.erro}
        </p>
      ) : (
        <>
          <section className={GRADE_CARDS}>
            {cardsEscuros.map((c) => (
              <CardKpi
                key={c.metrica}
                variante="escuro"
                tamanho="compacto"
                destaque
                label={c.nome_exibicao}
                value={valorCard(c)}
                pct={null}
                legenda=""
              />
            ))}
            <CardEventoRotativo label="Inscritos" campo="inscritos" eventos={eventos} />
            <CardEventoRotativo label="Aprovados" campo="aprovados" eventos={eventos} />
          </section>

          <section className={GRADE_CARDS}>
            {cardsClaros.map((c) => (
              <CardKpi
                key={c.metrica}
                tamanho="compacto"
                label={c.nome_exibicao}
                value={valorCard(c)}
                meta={metaCard(c)}
                pct={c.pct}
                legenda={legendaCard(c)}
              />
            ))}
          </section>

          {/*
            * `flex-[0.6_1_auto]`: parte da altura que sobra vem pra cá em vez de
            * ir toda pros cards — é o que mantém os KPIs colados no conteúdo
            * deles e dá corpo aos pódios. `grid-rows-[minmax(0,1fr)]`: em tela
            * baixa demais quem cede é a tabela (rola por dentro), não o grid.
            */}
          <section className={GRADE_RODAPE}>
            <div className="min-h-0 min-w-0 sm:col-span-2 lg:col-span-3">
              <TabelaPessoas pessoas={estado.dado?.pessoas ?? []} destaques={destaques} />
            </div>
            <div className="flex min-h-0 min-w-0 flex-col gap-2">
              <RankingPodio titulo="Ranking SDR" pessoas={sdrs} />
              <RankingPodio titulo="Ranking Closer" pessoas={closers} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
