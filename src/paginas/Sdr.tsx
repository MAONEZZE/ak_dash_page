import { useCallback, useEffect, useState } from "react";
import { AvisoFontes } from "../componentes/AvisoFontes";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { CardInscricoesSdr } from "../componentes/CardInscricoesSdr";
import { GraficoRitmoSdr } from "../componentes/GraficoRitmoSdr";
import { RankingSdr } from "../componentes/RankingSdr";
import { useEventoSelecionado } from "../componentes/PillEvento";
import { buscarPaginaSdr } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { useFiltrosAtuais } from "../lib/periodo";
import type { RespostaPaginaSdr, SdrPaginaSdr } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

/** SDRs com card próprio de inscrições do período, pelo primeiro nome, na ordem daqui. */
const SDRS_COM_CARD = ["juca", "jennifer"];

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0].toLowerCase();
}

interface EstadoSdr {
  dado: RespostaPaginaSdr | null;
  carregando: boolean;
  erro: string | null;
}

export function Sdr() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const evento = useEventoSelecionado();
  const [estado, setEstado] = useState<EstadoSdr>({
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
    await buscarPaginaSdr({ granularidade, periodo, evento })
      .then((dado) => setEstado({ dado, carregando: false, erro: null }))
      .catch((erro: unknown) =>
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro:
            erro instanceof Error
              ? erro.message
              : "Falha ao carregar a página de SDR.",
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

  const sdrsComCard: SdrPaginaSdr[] = SDRS_COM_CARD.flatMap((nome) =>
    dado.sdrs.filter((s) => primeiroNome(s.nome) === nome),
  );

  return (
    <>
      <AvisoFontes avisos={dado.avisos} />
      <div
        data-pagina="sdr"
        className="flex flex-col gap-4 md:grid md:h-full md:min-h-0 md:overflow-hidden md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:grid-rows-2"
      >
        <div className="min-h-0 md:col-start-1 md:row-start-1">
          <CardInscricoesSdr sdrs={sdrsComCard} />
        </div>
        <div className="min-h-0 md:col-start-1 md:row-start-2">
          <GraficoRitmoSdr
            janela={dado.janela}
            sdrs={sdrsComCard}
            titulo={dado.evento?.titulo ?? ""}
            semEvento={dado.evento === null}
          />
        </div>
        <div className="md:col-start-2 md:row-span-2 md:row-start-1 min-h-0">
          <RankingSdr sdrs={dado.sdrs} />
        </div>
      </div>
    </>
  );
}
