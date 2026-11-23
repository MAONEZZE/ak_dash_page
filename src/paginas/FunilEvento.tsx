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

function etapasEvento(f: EtapasFunilEvento): EtapaFunil[] {
  return [
    {
      rotulo: "Inscritos",
      valor: f.inscritos,
      passagem: {
        taxa: razao(f.onboarding_agendado, f.inscritos),
        texto: "agendaram onboarding",
      },
    },
    {
      rotulo: "Onboarding Agendado",
      valor: f.onboarding_agendado,
      passagem: {
        taxa: razao(f.onboarding_realizado, f.onboarding_agendado),
        texto: "fizeram onboarding",
      },
    },
    {
      rotulo: "Onboarding Realizado",
      valor: f.onboarding_realizado,
      passagem: {
        taxa: razao(f.comparecimento, f.onboarding_realizado),
        texto: "compareceram",
      },
    },
    {
      rotulo: "Comparecimento",
      valor: f.comparecimento,
      passagem: { taxa: razao(f.vendas, f.comparecimento), texto: "compraram" },
    },
    { rotulo: "Vendas", valor: f.vendas },
  ];
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

  const conversao =
    dado.funil.inscritos === 0 ? 0 : dado.funil.vendas / dado.funil.inscritos;

  return (
    <div className="flex flex-col gap-6">
      <AvisoFontes avisos={dado.avisos} />
      {dado.evento && (
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
              label="Total"
              value={formatarNumero(dado.evento.total)}
            />
            <CardKpi
              valorCentral
              label="Aprovados"
              value={formatarNumero(dado.evento.aprovados)}
            />
            <CardKpi
              valorCentral
              label="Pendentes"
              value={formatarNumero(dado.evento.pendentes)}
            />
            <CardKpi
              valorCentral
              label="Rejeitados"
              value={formatarNumero(dado.evento.rejeitados)}
            />
            <CardKpi
              valorCentral
              label="Conversão"
              subtitulo="inscritos → vendas"
              value={formatarTaxa(conversao)}
            />
          </section>
        </>
      )}
      <FunilBarras
        titulo="Funil do Evento"
        rotuloNoCanto
        etapas={etapasEvento(dado.funil)}
        conversaoTotal={razao(dado.funil.vendas, dado.funil.inscritos)}
      />
    </div>
  );
}
