import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AvisoFontes } from "../componentes/AvisoFontes";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { CardKpi } from "../componentes/CardKpi";
import { RankingPodio } from "../componentes/RankingPodio";
import { EVENTOS_POR_TABELA, TabelaEventos } from "../componentes/TabelaEventos";
import { Termometro } from "../componentes/Termometro";
import { buscarGeral } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarMoeda, formatarNumero, METRICAS_EM_MOEDA } from "../lib/formato";
import { useFiltrosAtuais } from "../lib/periodo";
import { useSomDeAumento, useSomDeEvento } from "../lib/som";
import type { CardGeral, RespostaGeral } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

/**
 * Uma grade de 4 colunas × 4 linhas (decisão do usuário, 2026-10-05):
 *
 *   Faturamento  | Reuniões Agendadas  | Inscrições Realizadas | Oportunidade
 *   Liquidado    | Ligações Realizadas | Confrarias (1–10)     | Confrarias (11–20)
 *   Termômetro   | Ranking SDR         |        ↓              |        ↓
 *        ↓       | Ranking Closer      |        ↓              |        ↓
 *
 * As duas primeiras linhas têm a altura dos cards (tipografia em vh) e as duas
 * últimas dividem o resto da tela — é o que alinha os cards entre colunas e
 * deixa cada ranking com metade do que sobra. Na TV (1920×1080) a página
 * inteira cabe sem rolagem. Abaixo de xl a posição explícita some e os itens
 * empilham na ordem do DOM: coluna 1, 2, 3, 4.
 */
const GRADE = "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-4 xl:grid-rows-[auto_auto_minmax(0,1fr)_minmax(0,1fr)]";
const POSICAO = {
  faturamento: "xl:col-start-1 xl:row-start-1",
  liquidado: "xl:col-start-1 xl:row-start-2",
  termometro: "xl:col-start-1 xl:row-start-3 xl:row-span-2",
  reunioes_agendadas: "xl:col-start-2 xl:row-start-1",
  ligacoes_realizadas: "xl:col-start-2 xl:row-start-2",
  ranking_sdr: "xl:col-start-2 xl:row-start-3",
  ranking_closer: "xl:col-start-2 xl:row-start-4",
  inscricoes_realizadas: "xl:col-start-3 xl:row-start-1",
  eventos_1: "xl:col-start-3 xl:row-start-2 xl:row-span-3",
  oportunidade: "xl:col-start-4 xl:row-start-1",
  eventos_2: "xl:col-start-4 xl:row-start-2 xl:row-span-3",
} as const;
/** Abaixo de xl a página rola: tabela, ranking e termômetro ganham altura mínima própria. */
const ALTURA_MOBILE = "min-h-[480px] xl:min-h-0";
const ALTURA_MOBILE_RANKING = "min-h-[300px] xl:min-h-0";

/** KPIs com meta que também usam o fundo escuro do Faturamento (decisão do usuário, 2026-10-05). */
const CARDS_ESCUROS_COM_META = new Set(["reunioes_agendadas", "ligacoes_realizadas", "inscricoes_realizadas", "oportunidade"]);

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
  if (c.meta === null) return "0";
  return METRICAS_EM_MOEDA.has(c.metrica) ? formatarMoeda(c.meta) : formatarNumero(c.meta);
}

/** Mesma grade da página, sem conteúdo — ver CardEsqueleto. */
function Esqueleto() {
  return (
    <section className={GRADE}>
      {Object.entries(POSICAO).map(([chave, posicao]) => (
        <CardEsqueleto key={chave} className={`h-full min-h-[104px] ${posicao}`} />
      ))}
    </section>
  );
}

/** Wrapper de posição na grade: o filho estica até a célula inteira. */
function Celula({ posicao, className = "", children }: { posicao: string; className?: string; children: ReactNode }) {
  return <div className={`flex min-w-0 flex-col *:flex-1 ${posicao} ${className}`}>{children}</div>;
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

  useSomDeAumento({ pessoas: estado.dado?.pessoas, granularidade, periodo });
  // Inscritos/Aprovados têm som próprio (arquivos .wav) e não dependem do período da página.
  useSomDeEvento(estado.dado?.eventos);

  // O "Atualizar" virou item do menu do header, que vive fora da árvore da página.
  useEffect(() => {
    registrar({ atualizadoEm, atualizando, aoAtualizar: carregar });
    return () => registrar({ atualizadoEm: null, atualizando: false, aoAtualizar: null });
  }, [atualizadoEm, atualizando, carregar, registrar]);

  const cards = estado.dado?.cards ?? [];
  const eventos = estado.dado?.eventos ?? [];
  const pessoas = estado.dado?.pessoas ?? [];
  const diasUteis = estado.dado?.dias_uteis ?? { decorridos: 0, total: 0 };

  function card(metrica: keyof typeof POSICAO) {
    const c = cards.find((x) => x.metrica === metrica);
    if (!c) return null;
    return (
      <Celula key={metrica} posicao={POSICAO[metrica]}>
        {c.escuro ? (
          <CardKpi variante="escuro" tamanho="compacto" destaque label={c.nome_exibicao} value={valorCard(c)} pct={null} legenda="" />
        ) : (
          <CardKpi
            variante={CARDS_ESCUROS_COM_META.has(metrica) ? "escuro" : "claro"}
            tamanho="compacto"
            label={c.nome_exibicao}
            value={valorCard(c)}
            meta={metaCard(c)}
            ritmo={{ realizado: c.realizado ?? 0, meta: c.meta, dias: diasUteis }}
          />
        )}
      </Celula>
    );
  }

  // Esqueleto/erro só tomam a tela inteira enquanto não há `dado` nenhum
  // (primeira carga). Depois disso a tela continua mostrando os últimos dados
  // bons até os novos chegarem.
  return (
    <div className="flex flex-col gap-2 xl:h-full xl:overflow-hidden">
      {estado.carregando && !estado.dado ? (
        <Esqueleto />
      ) : estado.erro && !estado.dado ? (
        <p className="text-xl text-muted" role="alert">
          {estado.erro}
        </p>
      ) : (
        <>
          <AvisoFontes avisos={estado.dado?.avisos} />
          {/* Ordem do DOM = ordem no celular: coluna 1, 2, 3, 4. */}
          <section className={GRADE} aria-label="Visão geral">
            {card("faturamento")}
            {card("liquidado")}
            <Celula posicao={POSICAO.termometro} className={ALTURA_MOBILE}>
              <Termometro dado={estado.dado?.termometro ?? null} />
            </Celula>

            {card("reunioes_agendadas")}
            {card("ligacoes_realizadas")}
            <Celula posicao={POSICAO.ranking_sdr} className={ALTURA_MOBILE_RANKING}>
              <RankingPodio cargo="sdr" pessoas={pessoas} />
            </Celula>
            <Celula posicao={POSICAO.ranking_closer} className={ALTURA_MOBILE_RANKING}>
              <RankingPodio cargo="closer" pessoas={pessoas} />
            </Celula>

            {card("inscricoes_realizadas")}
            <Celula posicao={POSICAO.eventos_1} className={ALTURA_MOBILE}>
              <TabelaEventos titulo="Confrarias do mês" eventos={eventos.slice(0, EVENTOS_POR_TABELA)} vazio="Nenhuma Confraria neste mês." />
            </Celula>

            {card("oportunidade")}
            <Celula posicao={POSICAO.eventos_2} className={ALTURA_MOBILE}>
              <TabelaEventos
                titulo="Confrarias do mês (cont.)"
                eventos={eventos.slice(EVENTOS_POR_TABELA, EVENTOS_POR_TABELA * 2)}
                vazio="Sem mais Confrarias."
              />
            </Celula>
          </section>
        </>
      )}
    </div>
  );
}
