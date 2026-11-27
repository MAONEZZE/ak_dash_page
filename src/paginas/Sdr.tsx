import { useCallback, useEffect, useState } from "react";
import { AvisoFontes } from "../componentes/AvisoFontes";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { RankingMeta } from "../componentes/RankingMeta";
import { useEventoSelecionado } from "../componentes/PillEvento";
import { buscarPaginaSdr } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarNumero } from "../lib/formato";
import { paraPeriodo } from "../lib/periodo";
import type { RespostaPaginaSdr } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

interface EstadoSdr {
  dado: RespostaPaginaSdr | null;
  carregando: boolean;
  erro: string | null;
}

export function Sdr() {
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
    // Filtro de data desabilitado nesta página (App.tsx): sempre o mês corrente, calculado a cada
    // carga para virar sozinho no dia 1º; o período da URL (vindo de outra página) é ignorado.
    await buscarPaginaSdr({ granularidade: "mes", periodo: paraPeriodo("mes", new Date()), evento })
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
  }, [evento]);

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

  return (
    <>
      <AvisoFontes avisos={dado.avisos} />
      <div data-pagina="sdr" className="flex flex-col md:h-full md:min-h-0 md:overflow-hidden">
        <RankingMeta
          titulo="Ranking SDR — Inscritos gerados"
          rotuloLista="Ranking SDR"
          itens={dado.sdrs.map((s) => ({
            id: s.id_user,
            nome: s.nome,
            valor: s.ranking_mes.inscricoes,
            valorHoje: s.ranking_mes.inscricoes_hoje,
            meta: s.ranking_mes.meta,
            negocios: s.ranking_mes.negocios,
          }))}
          janela={dado.janela_meta ?? dado.mes_ranking}
          unidade={{ singular: "inscrição", plural: "inscrições" }}
          legendaHoje="Inscrições de hoje"
          badge={dado.inscritos_sed_mes !== null ? `${formatarNumero(dado.inscritos_sed_mes)} inscritos` : null}
          vazio="Nenhum SDR ativo."
        />
      </div>
    </>
  );
}
