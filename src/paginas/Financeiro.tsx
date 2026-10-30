import { AvisoFontes } from "../componentes/AvisoFontes";
import { useCallback, useEffect, useState } from "react";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { CardKpi } from "../componentes/CardKpi";
import { GraficoLinhasFinanceiro } from "../componentes/GraficoLinhasFinanceiro";
import { TabelaAgrupada, type ColunaAgrupada } from "../componentes/TabelaAgrupada";
import {
  agruparPor,
  agruparPorFormaPagamento,
  CANAIS_CANONICOS,
  chaveCanal,
  chaveCloser,
  chaveProduto,
  METODOS_PAGAMENTO_CANONICOS,
  PRODUTOS_CANONICOS,
  serieMensal,
  resumoDoAno,
  totaisDoPeriodo,
  totalDeLinhas,
  type ItemCanonico,
  type LinhaAgrupada,
} from "../lib/agregacoes-financeiro";
import { buscarFinanceiro, buscarPessoas } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarMoeda, formatarNumero, formatarPercentual } from "../lib/formato";
import { limitesPeriodo, useFiltrosAtuais } from "../lib/periodo";
import type { Pessoa, RespostaFinanceiro } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

interface Estado {
  dado: RespostaFinanceiro | null;
  closers: Pessoa[];
  carregando: boolean;
  erro: string | null;
}

const ESTADO_INICIAL: Estado = { dado: null, closers: [], carregando: true, erro: null };

// Colunas que leem `pago`/`liquido` mostram "—" quando `recebimentosPorMes` é false (dia/semana).
function colunasCanal(recebimentosPorMes: boolean): ColunaAgrupada[] {
  return [
    { titulo: "Bruto vendido", valor: (l) => formatarMoeda(l.bruto) },
    { titulo: "Nº vendas", valor: (l) => formatarNumero(l.vendas) },
    { titulo: "Pago no mês", valor: (l) => (recebimentosPorMes ? formatarMoeda(l.pago) : "—") },
  ];
}

function colunasMetodo(recebimentosPorMes: boolean): ColunaAgrupada[] {
  return [
    { titulo: "Pago pelo cliente", valor: (l) => (recebimentosPorMes ? formatarMoeda(l.pago) : "—") },
    { titulo: "Taxa (R$)", valor: (l) => (recebimentosPorMes ? formatarMoeda(l.pago - l.liquido) : "—") },
    { titulo: "Líquido na conta", valor: (l) => (recebimentosPorMes ? formatarMoeda(l.liquido) : "—") },
    { titulo: "% de taxa", valor: (l) => (recebimentosPorMes ? formatarPercentual(l.pago - l.liquido, l.pago) : "—") },
  ];
}

function colunasCloser(recebimentosPorMes: boolean): ColunaAgrupada[] {
  return [
    { titulo: "Bruto vendido", valor: (l) => formatarMoeda(l.bruto) },
    { titulo: "Nº vendas", valor: (l) => formatarNumero(l.vendas) },
    { titulo: "Pago no mês", valor: (l) => (recebimentosPorMes ? formatarMoeda(l.pago) : "—") },
    { titulo: "Líquido no mês", valor: (l) => (recebimentosPorMes ? formatarMoeda(l.liquido) : "—") },
  ];
}

function colunasProduto(recebimentosPorMes: boolean): ColunaAgrupada[] {
  return [
    { titulo: "Bruto vendido", valor: (l) => formatarMoeda(l.bruto) },
    { titulo: "Nº vendas", valor: (l) => formatarNumero(l.vendas) },
    { titulo: "Ticket médio", valor: (l) => formatarMoeda(l.vendas > 0 ? l.bruto / l.vendas : 0) },
    { titulo: "Pago no mês", valor: (l) => (recebimentosPorMes ? formatarMoeda(l.pago) : "—") },
  ];
}

function tabelaComTotal(linhas: LinhaAgrupada[]): { linhas: LinhaAgrupada[]; total: LinhaAgrupada } {
  return { linhas, total: totalDeLinhas(linhas) };
}

/** Mesma grade da página, sem conteúdo — ver CardEsqueleto. */
function Esqueleto() {
  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <CardEsqueleto key={i} className="min-h-[168px]" />
        ))}
      </section>
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <CardEsqueleto className="min-h-[420px] lg:col-span-2" />
        <CardEsqueleto className="min-h-[420px]" />
      </section>
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
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
  // e as agregações abaixo). Isso é o que sustenta o card 4 (bruto vendido no
  // ano) e a série mensal sem uma segunda requisição.
  // No Customizado (`inicio..fim`) vale o ano do fim — é ele que fecha o ano.
  const anoAlvo = granularidade === "ano" ? periodo : granularidade === "custom" ? limitesPeriodo(granularidade, periodo).fim.slice(0, 4) : periodo.slice(0, 4);

  const carregar = useCallback(async () => {
    setAtualizando(true);
    setEstado((atual) => ({ ...atual, carregando: true }));
    try {
      const [dado, pessoas] = await Promise.all([
        buscarFinanceiro({ granularidade: "ano", periodo: anoAlvo }),
        buscarPessoas(),
      ]);
      setEstado({ dado, closers: pessoas.filter((p) => p.cargo === "closer"), carregando: false, erro: null });
    } catch (erro: unknown) {
      // Mantém o `dado`/`closers` já carregados no refresh que falhou — um
      // 401 passageiro ou uma instabilidade de rede no auto-refresh de 60s
      // não pode apagar a tela que já estava funcionando.
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

  const vendasAno = estado.dado.vendas;
  const { inicio, fim } = limitesPeriodo(granularidade, periodo);

  // o calendário da planilha é mensal; num dia ou semana o mês inteiro enganaria
  const recebimentosPorMes = granularidade !== "dia" && granularidade !== "semana";
  const totais = totaisDoPeriodo(vendasAno, inicio, fim);
  const hojeMes = new Date().toISOString().slice(0, 7);
  const mesLimite = hojeMes < `${anoAlvo}-12` ? hojeMes : `${anoAlvo}-12`;
  const anoResumo = resumoDoAno(vendasAno, anoAlvo, mesLimite);
  const serie = serieMensal(vendasAno, anoAlvo);

  const closersCanonicos: ItemCanonico[] = estado.closers.map((c) => ({ chave: c.id, rotulo: c.nome }));

  const porCanal = tabelaComTotal(agruparPor(vendasAno, chaveCanal, CANAIS_CANONICOS, inicio, fim));
  const porMetodo = tabelaComTotal(agruparPorFormaPagamento(vendasAno, METODOS_PAGAMENTO_CANONICOS, inicio, fim));
  const porCloser = tabelaComTotal(agruparPor(vendasAno, chaveCloser, closersCanonicos, inicio, fim));
  const porProduto = tabelaComTotal(agruparPor(vendasAno, chaveProduto, PRODUTOS_CANONICOS, inicio, fim));

  return (
    <div className="flex flex-col gap-5">
      <AvisoFontes avisos={estado.dado.avisos} />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CardKpi
          label="Contrato bruto vendido"
          value={formatarMoeda(totais.vendido)}
          pct={null}
          legenda={
            totais.contratos === 0 ? "nenhum contrato fechado no período" : `ticket médio ${formatarMoeda(totais.ticketMedio!)} · ${totais.contratos} contratos fechados`
          }
        />
        <CardKpi
          label="Recebimento bruto"
          value={recebimentosPorMes ? formatarMoeda(totais.pago) : "—"}
          pct={null}
          legenda={
            recebimentosPorMes
              ? `${formatarMoeda(totais.pagoDeVendasDoPeriodo)} veio de contrato fechado no período`
              : "Recebimentos só por mês"
          }
        />
        <CardKpi
          label="Liquidou na conta"
          value={recebimentosPorMes ? formatarMoeda(totais.liquido) : "—"}
          pct={null}
          legenda={recebimentosPorMes ? `${formatarMoeda(totais.descontos)} de taxas de maquininha e imposto` : "Recebimentos só por mês"}
        />
        <CardKpi label="Bruto vendido no ano" value={formatarMoeda(anoResumo.brutoNoAno)} pct={null} legenda="valor dos contratos assinados no ano" />
      </section>

      {/*
        * O grid de baixo é `grid-cols-3` (metodo/closer/produto). Este aqui
        * usa a MESMA grade — gráficos ocupando 2 colunas, canal 1 — pra
        * "gráficos" ficar alinhado com "metodo + closer" e "canal" alinhado
        * com "produto", em vez de uma largura própria (2.15fr/1fr) que não
        * batia com a linha de baixo.
        */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <article className="glass-panel flex min-w-0 flex-col gap-4 rounded-[24px] px-[21px] pb-3 pt-[19px] lg:col-span-2">
          <GraficoLinhasFinanceiro
            titulo="Vendido"
            series={[{ rotulo: "Vendido", valores: serie.map((p) => p.vendido), cor: "brand" }]}
            piso={1_000_000}
            multiploTeto={250_000}
          />
          <div className="border-t border-line" />
          <GraficoLinhasFinanceiro
            titulo="Total recebido × Liquidou"
            series={[
              { rotulo: "Total recebido", valores: serie.map((p) => p.totalRecebido), cor: "brand" },
              { rotulo: "Liquidou", valores: serie.map((p) => p.liquidouVendasDoMes), cor: "closer", tracejada: true },
            ]}
            piso={300_000}
            multiploTeto={100_000}
            mostrarEixoX
          />
        </article>
        <TabelaAgrupada
          titulo="Por canal"
          colunaRotulo="Canal"
          linhas={porCanal.linhas}
          colunas={colunasCanal(recebimentosPorMes)}
          total={porCanal.total}
          tamanho="compacto"
        />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TabelaAgrupada
          titulo="Como entrou o dinheiro"
          colunaRotulo="Forma de pagamento"
          linhas={porMetodo.linhas}
          colunas={colunasMetodo(recebimentosPorMes)}
          total={porMetodo.total}
          tamanho="grande"
        />
        <TabelaAgrupada
          titulo="Desempenho por closer"
          colunaRotulo="Closer"
          linhas={porCloser.linhas}
          colunas={colunasCloser(recebimentosPorMes)}
          total={porCloser.total}
          tamanho="grande"
        />
        <TabelaAgrupada
          titulo="Desempenho por produto"
          colunaRotulo="Produto"
          linhas={porProduto.linhas}
          colunas={colunasProduto(recebimentosPorMes)}
          tamanho="grande"
          total={porProduto.total}
        />
      </section>
    </div>
  );
}
