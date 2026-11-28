import { AvisoFontes } from "../componentes/AvisoFontes";
import { useCallback, useEffect, useState } from "react";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { CardKpi } from "../componentes/CardKpi";
import { GraficoLinhasFinanceiro } from "../componentes/GraficoLinhasFinanceiro";
import { TabelaAgrupada } from "../componentes/TabelaAgrupada";
import { TabelaMesAMes } from "../componentes/TabelaMesAMes";
import {
  acumuladoDoAno,
  agruparPorCanal,
  agruparPorForma,
  agruparPorProduto,
  serieMensal,
  totaisDoPeriodo,
  totalDeLinhas,
  totalSerie,
} from "../lib/agregacoes-notas";
import { buscarFinanceiro } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarMoeda, formatarNumero, formatarPercentual } from "../lib/formato";
import { limitesPeriodo, useFiltrosAtuais } from "../lib/periodo";
import type { RespostaFinanceiro } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

interface Estado {
  dado: RespostaFinanceiro | null;
  carregando: boolean;
  erro: string | null;
}

const ESTADO_INICIAL: Estado = { dado: null, carregando: true, erro: null };

/**
 * Número dos 5 cards do Financeiro. A escala padrão do CardKpi assume até 4
 * colunas e corta "R$ 118.000,00" na grade de 5 (sobram ~150px úteis por card
 * com a barra lateral de 240px a 1280px). O teto em vw sai da largura útil ÷
 * ~7,2em ("R$ 1.234.567,89") no ponto mais estreito de cada grade: 1 coluna
 * (360px), 2 colunas (640px) e 5 colunas (1280px).
 */
const TAMANHO_VALOR_FINANCEIRO =
  "text-[clamp(16px,9vw,50px)] sm:text-[clamp(16px,4.5vw,50px)] xl:text-[clamp(14px,1.6vw,50px)]";

/** Mesma grade da página, sem conteúdo — ver CardEsqueleto. */
function Esqueleto() {
  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <CardEsqueleto key={i} className="min-h-[168px]" />
        ))}
      </section>
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <CardEsqueleto className="min-h-[420px] lg:col-span-2" />
        <CardEsqueleto className="min-h-[420px]" />
      </section>
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <CardEsqueleto key={i} className="min-h-[320px]" />
        ))}
      </section>
    </div>
  );
}

export function Financeiro() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL);
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const { registrar } = useAtualizacao();

  // A Financeiro busca sempre o ANO INTEIRO do período selecionado — o
  // recorte pra dia/semana/mês/ano acontece em memória (ver `limitesPeriodo`
  // e as agregações abaixo). Isso sustenta o acumulado do ano e a série mensal
  // sem uma segunda requisição.
  // No Customizado (`inicio..fim`) vale o ano do fim — é ele que fecha o ano.
  const anoAlvo = granularidade === "ano" ? periodo : granularidade === "custom" ? limitesPeriodo(granularidade, periodo).fim.slice(0, 4) : periodo.slice(0, 4);

  const carregar = useCallback(async () => {
    setAtualizando(true);
    setEstado((atual) => ({ ...atual, carregando: true }));
    try {
      const dado = await buscarFinanceiro({ granularidade: "ano", periodo: anoAlvo });
      setEstado({ dado, carregando: false, erro: null });
    } catch (erro: unknown) {
      // Mantém o `dado` já carregado no refresh que falhou — um 401 passageiro
      // ou uma instabilidade de rede no auto-refresh de 60s não pode apagar a
      // tela que já estava funcionando.
      setEstado((atual) => ({
        ...atual,
        carregando: false,
        erro: erro instanceof Error ? erro.message : "Falha ao carregar Financeiro.",
      }));
    }
    setAtualizadoEm(new Date());
    setAtualizando(false);
  }, [anoAlvo]);

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

  // `carregando`/`erro` só tomam a tela inteira quando ainda não há `dado`
  // nenhum (primeira carga). Depois disso, o auto-refresh de 60s troca só os
  // valores — sem esse guard, a página piscava a cada refresh (voltava pro
  // esqueleto e sumia o conteúdo por um instante).
  if (estado.carregando && !estado.dado) {
    return <Esqueleto />;
  }
  if (estado.erro && !estado.dado) {
    return (
      <p className="text-xl text-muted" role="alert">
        {estado.erro}
      </p>
    );
  }
  if (!estado.dado) return null;

  const notas = estado.dado.notas;
  const { inicio, fim } = limitesPeriodo(granularidade, periodo);

  // o calendário da planilha é mensal; num dia ou semana o mês inteiro enganaria
  const recebimentosPorMes = granularidade !== "dia" && granularidade !== "semana";
  const receita = (v: number) => (recebimentosPorMes ? formatarMoeda(v) : "—");
  const legendaReceita = (texto: string) => (recebimentosPorMes ? texto : "Receita só por mês");

  const t = totaisDoPeriodo(notas, inicio, fim);
  const ano = acumuladoDoAno(notas, anoAlvo);
  const serie = serieMensal(notas, anoAlvo);
  const porCanal = agruparPorCanal(notas, inicio, fim);
  const porForma = agruparPorForma(notas, inicio, fim);
  const porProduto = agruparPorProduto(notas, inicio, fim);
  const totalCanal = totalDeLinhas(porCanal);
  const totalForma = totalDeLinhas(porForma);
  const totalProduto = totalDeLinhas(porProduto);

  return (
    <div className="flex flex-col gap-5">
      <AvisoFontes avisos={estado.dado.avisos} />
      <section aria-label="Indicadores do período" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CardKpi
          classeTamanhoValor={TAMANHO_VALOR_FINANCEIRO}
          label="Faturamento"
          value={formatarMoeda(t.faturamento)}
          pct={null}
          legenda={t.vendas === 0 ? "nenhuma venda no período" : `ticket médio ${formatarMoeda(t.ticketMedio!)}`}
        />
        <CardKpi classeTamanhoValor={TAMANHO_VALOR_FINANCEIRO} label="Receita líquida" value={receita(t.receita)} pct={null} legenda={legendaReceita("valor pago que entrou na conta")} />
        <CardKpi classeTamanhoValor={TAMANHO_VALOR_FINANCEIRO} label="liquidado time comercial" value={receita(t.receitaComercial)} pct={null} legenda={legendaReceita("vendas novas")} />
        <CardKpi classeTamanhoValor={TAMANHO_VALOR_FINANCEIRO} label="liquidado da base" value={receita(t.receitaBase)} pct={null} legenda={legendaReceita("mensalidades e upsell")} />
        <CardKpi classeTamanhoValor={TAMANHO_VALOR_FINANCEIRO} label="Acumulado do ano" value={formatarMoeda(ano.faturamento)} pct={null} legenda={`liquidado ano ${formatarMoeda(ano.receita)}`} />
      </section>

      {/*
        * O grid de baixo é `grid-cols-3` (gráficos + canal). Os gráficos ocupam
        * 2 colunas e o canal 1, pra ficar alinhado com a tabela de canal ao
        * lado, em vez de uma largura própria que não bateria com a linha de baixo.
        */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <article className="glass-panel flex min-w-0 flex-col gap-4 rounded-[24px] px-[21px] pb-3 pt-[19px] lg:col-span-2">
          <GraficoLinhasFinanceiro
            titulo="Faturamento"
            series={[{ rotulo: "Faturamento", valores: serie.map((p) => p.faturamento), cor: "brand" }]}
            piso={1_000_000}
            multiploTeto={250_000}
          />
          <div className="border-t border-line" />
          <GraficoLinhasFinanceiro
            titulo="Receita líquida"
            series={[
              { rotulo: "Total", valores: serie.map((p) => p.receita), cor: "brand" },
              { rotulo: "Time comercial", valores: serie.map((p) => p.receitaComercial), cor: "closer" },
              { rotulo: "Base", valores: serie.map((p) => p.receitaBase), cor: "warn", tracejada: true },
            ]}
            piso={300_000}
            multiploTeto={100_000}
            mostrarEixoX
          />
        </article>
        <TabelaAgrupada
          titulo="Por canal"
          colunaRotulo="Canal"
          linhas={porCanal}
          colunas={[
            { titulo: "Faturamento", valor: (l) => formatarMoeda(l.faturamento) },
            { titulo: "Nº vendas", valor: (l) => formatarNumero(l.vendas) },
            { titulo: "% do faturamento", valor: (l) => formatarPercentual(l.faturamento, totalCanal.faturamento) },
          ]}
          total={totalCanal}
          tamanho="compacto"
        />
      </section>

      <section>
        <TabelaMesAMes pontos={serie} total={totalSerie(serie)} ano={anoAlvo} />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <TabelaAgrupada
          titulo="Como entrou o dinheiro"
          colunaRotulo="Forma de pagamento"
          linhas={porForma}
          colunas={[{ titulo: "Receita líquida", valor: (l) => receita(l.receita) }]}
          total={totalForma}
          tamanho="grande"
        />
        <TabelaAgrupada
          titulo="Desempenho por produto"
          colunaRotulo="Produto"
          linhas={porProduto}
          colunas={[
            { titulo: "Faturamento", valor: (l) => formatarMoeda(l.faturamento) },
            { titulo: "Nº vendas", valor: (l) => formatarNumero(l.vendas) },
            { titulo: "Receita líquida", valor: (l) => receita(l.receita) },
          ]}
          total={totalProduto}
          tamanho="grande"
        />
      </section>
    </div>
  );
}
