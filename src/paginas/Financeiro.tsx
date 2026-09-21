import { useCallback, useEffect, useState } from "react";
import { CardKpi } from "../componentes/CardKpi";
import { GraficoLinhasFinanceiro } from "../componentes/GraficoLinhasFinanceiro";
import { TabelaAgrupada, type ColunaAgrupada } from "../componentes/TabelaAgrupada";
import {
  agruparPor,
  CANAIS_CANONICOS,
  chaveCanal,
  chaveCloser,
  chaveMetodoPagamento,
  chaveProduto,
  METODOS_PAGAMENTO_CANONICOS,
  PRODUTOS_CANONICOS,
  serieMensal,
  totaisDoPeriodo,
  totalDeLinhas,
  totalYtd,
  type ItemCanonico,
  type LinhaAgrupada,
} from "../lib/agregacoes-financeiro";
import { buscarFinanceiro, buscarPessoas } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarMoeda, formatarNumero, formatarPercentual } from "../lib/formato";
import { limitesPeriodo, useFiltrosAtuais } from "../lib/periodo";
import type { Pessoa, RespostaFinanceiro } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;
const LEGENDA_SEM_META = "Meta não cadastrada";

interface Estado {
  dado: RespostaFinanceiro | null;
  closers: Pessoa[];
  carregando: boolean;
  erro: string | null;
}

const ESTADO_INICIAL: Estado = { dado: null, closers: [], carregando: true, erro: null };

const COLUNAS_CANAL: ColunaAgrupada[] = [
  { titulo: "Bruto vendido", valor: (l) => formatarMoeda(l.bruto) },
  { titulo: "Nº vendas", valor: (l) => formatarNumero(l.vendas) },
  { titulo: "Pago no mês", valor: (l) => formatarMoeda(l.pago) },
];

const COLUNAS_METODO: ColunaAgrupada[] = [
  { titulo: "Pago pelo cliente", valor: (l) => formatarMoeda(l.pago) },
  { titulo: "Imposto (R$)", valor: (l) => formatarMoeda(l.imposto) },
  { titulo: "Taxa (R$)", valor: (l) => formatarMoeda(l.taxa) },
  { titulo: "Líquido na conta", valor: (l) => formatarMoeda(l.liquido) },
  { titulo: "% de taxa", valor: (l) => formatarPercentual(l.pago - l.liquido, l.pago) },
];

const COLUNAS_CLOSER: ColunaAgrupada[] = [
  { titulo: "Bruto vendido", valor: (l) => formatarMoeda(l.bruto) },
  { titulo: "Nº vendas", valor: (l) => formatarNumero(l.vendas) },
  { titulo: "Pago no mês", valor: (l) => formatarMoeda(l.pago) },
  { titulo: "Líquido no mês", valor: (l) => formatarMoeda(l.liquido) },
];

const COLUNAS_PRODUTO: ColunaAgrupada[] = [
  { titulo: "Bruto vendido", valor: (l) => formatarMoeda(l.bruto) },
  { titulo: "Nº vendas", valor: (l) => formatarNumero(l.vendas) },
  { titulo: "Ticket médio", valor: (l) => formatarMoeda(l.vendas > 0 ? l.bruto / l.vendas : 0) },
  { titulo: "Pago no mês", valor: (l) => formatarMoeda(l.pago) },
];

function tabelaComTotal(linhas: LinhaAgrupada[]): { linhas: LinhaAgrupada[]; total: LinhaAgrupada } {
  return { linhas, total: totalDeLinhas(linhas) };
}

export function Financeiro() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL);
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const { registrar } = useAtualizacao();

  // A Financeiro busca sempre o ANO INTEIRO do período selecionado — o
  // recorte pra dia/semana/mês/ano acontece em memória (ver `limitesPeriodo`
  // e as agregações abaixo). Isso é o que sustenta o card 4 (YTD) e a série
  // mensal sem uma segunda requisição.
  const anoAlvo = granularidade === "ano" ? periodo : periodo.slice(0, 4);

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
      setEstado({
        dado: null,
        closers: [],
        carregando: false,
        erro: erro instanceof Error ? erro.message : "Falha ao carregar Financeiro.",
      });
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

  if (estado.carregando) {
    return <p className="text-xl text-fg/60">Carregando…</p>;
  }
  if (estado.erro || !estado.dado) {
    return (
      <p className="text-xl text-fg/60" role="alert">
        {estado.erro}
      </p>
    );
  }

  const vendasAno = estado.dado.vendas;
  const { inicio, fim } = limitesPeriodo(granularidade, periodo);
  const vendasPeriodo = vendasAno.filter((v) => {
    const dia = v.data_venda.slice(0, 10);
    return dia >= inicio && dia <= fim;
  });

  const totais = totaisDoPeriodo(vendasPeriodo);
  const ytd = totalYtd(vendasAno, fim);
  const serie = serieMensal(vendasAno, anoAlvo);

  const closersCanonicos: ItemCanonico[] = estado.closers.map((c) => ({ chave: c.id, rotulo: c.nome }));

  const porCanal = tabelaComTotal(agruparPor(vendasPeriodo, chaveCanal, CANAIS_CANONICOS));
  const porMetodo = tabelaComTotal(agruparPor(vendasPeriodo, chaveMetodoPagamento, METODOS_PAGAMENTO_CANONICOS));
  const porCloser = tabelaComTotal(agruparPor(vendasPeriodo, chaveCloser, closersCanonicos));
  const porProduto = tabelaComTotal(agruparPor(vendasPeriodo, chaveProduto, PRODUTOS_CANONICOS));

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <CardKpi label="Contrato bruto vendido" value={formatarMoeda(totais.vendido)} pct={null} legenda={LEGENDA_SEM_META} />
        <CardKpi label="Recebimento bruto" value={formatarMoeda(totais.pago)} pct={null} legenda={LEGENDA_SEM_META} />
        <CardKpi label="Liquidou na conta" value={formatarMoeda(totais.liquido)} pct={null} legenda={LEGENDA_SEM_META} />
        <CardKpi label="Bruto vendido no ano (YTD)" value={formatarMoeda(ytd)} pct={null} legenda={LEGENDA_SEM_META} />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2.15fr)_minmax(272px,1fr)]">
        <article className="glass-panel flex flex-col gap-4 rounded-2xl px-[21px] pb-3 pt-[19px]">
          <GraficoLinhasFinanceiro
            titulo="Vendido"
            series={[{ rotulo: "Vendido", valores: serie.map((p) => p.vendido), cor: "accent" }]}
            piso={1_000_000}
            multiploTeto={250_000}
          />
          <div className="border-t border-border-2" />
          <GraficoLinhasFinanceiro
            titulo="Pago × Líquido"
            series={[
              { rotulo: "Pago", valores: serie.map((p) => p.pago), cor: "status-bad" },
              { rotulo: "Líquido", valores: serie.map((p) => p.liquido), cor: "status-bad", tracejada: true },
            ]}
            piso={300_000}
            multiploTeto={100_000}
            mostrarEixoX
          />
        </article>
        <TabelaAgrupada titulo="Por canal" colunaRotulo="Canal" linhas={porCanal.linhas} colunas={COLUNAS_CANAL} total={porCanal.total} />
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TabelaAgrupada
          titulo="Como entrou o dinheiro"
          colunaRotulo="Forma de pagamento"
          linhas={porMetodo.linhas}
          colunas={COLUNAS_METODO}
          total={porMetodo.total}
        />
        <TabelaAgrupada
          titulo="Desempenho por closer"
          colunaRotulo="Closer"
          linhas={porCloser.linhas}
          colunas={COLUNAS_CLOSER}
          total={porCloser.total}
        />
        <TabelaAgrupada
          titulo="Desempenho por produto"
          colunaRotulo="Produto"
          linhas={porProduto.linhas}
          colunas={COLUNAS_PRODUTO}
          total={porProduto.total}
        />
      </section>
    </div>
  );
}
