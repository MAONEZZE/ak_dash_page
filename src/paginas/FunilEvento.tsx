import { useCallback, useEffect, useState } from "react";
import { AvisoFontes } from "../componentes/AvisoFontes";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { CardKpi } from "../componentes/CardKpi";
import { FunilBarras, type EtapaFunil } from "../componentes/FunilBarras";
import { buscarFunilEvento } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarTaxa, razao } from "../lib/funil";
import { formatarDataHoraEvento, formatarNumero } from "../lib/formato";
import { useEventoSelecionado } from "../componentes/PillEvento";
import { useFiltrosAtuais } from "../lib/periodo";
import type {
  EtapasFunilEvento,
  RespostaFunilEvento,
} from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

/**
 * Número dos 5 cards do evento. Os 95px do `valorCentral` cortam "20,0%" na
 * grade de 5 colunas (sobram ~150px úteis por card com a barra lateral de
 * 240px a 1280px). O teto em vw sai da largura útil ÷ ~3,6em ("100,0%") no
 * ponto mais estreito de cada grade: 2 colunas (360px), 3 colunas (640px) e
 * 5 colunas (1280px). Depois aumentado 1,7× e reduzido 1,2× a pedido (mín., vw e teto).
 */
const TAMANHO_VALOR_EVENTO =
  "text-[clamp(40px,12.75vw,135px)] sm:text-[clamp(40px,7.5vw,135px)] xl:text-[clamp(40px,4.53vw,135px)]";

/**
 * Cada inscrito está numa etapa só. A etapa Aprovados não aparece, mas os
 * aprovados que ainda não avançaram contam na base: a passagem da 1ª etapa é
 * sobre o total de inscritos. A passagem usa o acumulado: quem está na etapa
 * seguinte ou além ÷ quem está nesta etapa ou além.
 */
function etapasEvento(f: EtapasFunilEvento): EtapaFunil[] {
  const etapas: { rotulo: string; valor: number; texto?: string }[] = [
    { rotulo: "Pendentes", valor: f.pendentes, texto: "agendaram onboarding" },
    { rotulo: "Onboarding Agendado", valor: f.onboarding_agendado, texto: "fizeram onboarding" },
    { rotulo: "Onboarding Realizado", valor: f.onboarding_realizado, texto: "compareceram" },
    { rotulo: "Comparecimento", valor: f.comparecimento, texto: "compraram" },
    { rotulo: "Vendas", valor: f.vendas },
  ];
  const acumulado = etapas.map((_, i) =>
    etapas.slice(i).reduce((soma, e) => soma + e.valor, 0),
  );
  acumulado[0] += f.aprovados;
  return etapas.map(({ rotulo, valor, texto }, i) => ({
    rotulo,
    valor,
    ...(texto && {
      passagem: { taxa: razao(acumulado[i + 1], acumulado[i]), texto },
    }),
  }));
}

function totalDoFunil(f: EtapasFunilEvento): number {
  return (
    f.pendentes +
    f.aprovados +
    f.onboarding_agendado +
    f.onboarding_realizado +
    f.comparecimento +
    f.vendas
  );
}

interface EstadoFunil {
  dado: RespostaFunilEvento | null;
  carregando: boolean;
  erro: string | null;
}

export function FunilEvento() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const evento = useEventoSelecionado();
  const [estado, setEstado] = useState<EstadoFunil>({
    dado: null,
    carregando: true,
    erro: null,
  });
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const { registrar } = useAtualizacao();

  // No `catch`, mantém o `dado` já carregado: um refresh que falhou não apaga a tela.
  const carregar = useCallback(async () => {
    setAtualizando(true);
    setEstado((atual) => ({ ...atual, carregando: true }));
    await buscarFunilEvento({ granularidade, periodo, evento })
      .then((dado) => setEstado({ dado, carregando: false, erro: null }))
      .catch((erro: unknown) =>
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro:
            erro instanceof Error
              ? erro.message
              : "Falha ao carregar o funil de evento.",
        })),
      );
    setAtualizadoEm(new Date());
    setAtualizando(false);
  }, [granularidade, periodo, evento]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, INTERVALO_AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [carregar]);

  // Header vive fora da árvore desta página (App.tsx): repassa o "Atualizar".
  useEffect(() => {
    registrar({ atualizadoEm, atualizando, aoAtualizar: carregar });
    return () =>
      registrar({ atualizadoEm: null, atualizando: false, aoAtualizar: null });
  }, [atualizadoEm, atualizando, carregar, registrar]);

  const { dado, erro } = estado;

  if (!dado) {
    return erro ? (
      <p className="text-xl text-muted" role="alert">
        {erro}
      </p>
    ) : (
      <div className="flex flex-col gap-6">
        <CardEsqueleto className="min-h-[280px]" />
        <CardEsqueleto className="min-h-[240px]" />
      </div>
    );
  }

  const base = totalDoFunil(dado.funil);
  const conversao = base === 0 ? 0 : dado.funil.vendas / base;

  return (
    <div className="flex flex-col gap-6">
      <AvisoFontes avisos={dado.avisos} />
      {dado.evento ? (
        <>
          <h2 className="font-display text-[22px] font-bold tracking-tight">
            {dado.evento.titulo}
            {dado.evento.data
              ? ` · ${formatarDataHoraEvento(dado.evento.data)}`
              : ""}
          </h2>
          <section
            aria-label="Cards do evento"
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5"
          >
            <CardKpi
              valorCentral
              classeTamanhoValor={TAMANHO_VALOR_EVENTO}
              label="Total (SED)"
              value={formatarNumero(dado.evento.total)}
            />
            <CardKpi
              valorCentral
              classeTamanhoValor={TAMANHO_VALOR_EVENTO} 
              label="Aprovados"
              value={formatarNumero(dado.evento.aprovados)}
            />
            <CardKpi
              valorCentral
              classeTamanhoValor={TAMANHO_VALOR_EVENTO}
              label="Pendentes"
              value={formatarNumero(dado.evento.pendentes)}
            />
            <CardKpi
              valorCentral
              classeTamanhoValor={TAMANHO_VALOR_EVENTO}
              label="Rejeitados"
              value={formatarNumero(dado.evento.rejeitados)}
            />
            <CardKpi
              valorCentral
              classeTamanhoValor={TAMANHO_VALOR_EVENTO}
              label="Conversão"
              subtitulo="inscritos → vendas"
              value={formatarTaxa(conversao)}
            />
          </section>
        </>
      ) : (
        <p className="text-xl text-muted">Nenhuma imersão encontrada</p>
      )}
      <FunilBarras
        titulo="Funil do Evento"
        rotuloNoCanto
        etapas={etapasEvento(dado.funil)}
        conversaoTotal={razao(dado.funil.vendas, base)}
      />
    </div>
  );
}
