import { useCallback, useEffect, useMemo, useState } from "react";
import { AvisoFontes } from "../componentes/AvisoFontes";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { RankingMeta } from "../componentes/RankingMeta";
import { buscarPaginaSeller } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { paraPeriodo } from "../lib/periodo";
import { useSomDeRanking } from "../lib/som";
import { plin } from "../lib/som-audio";
import type { RespostaPaginaSeller } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

const tocarPlinSeller = () => plin("seller");

interface EstadoSeller {
  dado: RespostaPaginaSeller | null;
  carregando: boolean;
  erro: string | null;
}

export function Seller() {
  const [estado, setEstado] = useState<EstadoSeller>({
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
    await buscarPaginaSeller({ granularidade: "mes", periodo: paraPeriodo("mes", new Date()) })
      .then((dado) => setEstado({ dado, carregando: false, erro: null }))
      .catch((erro: unknown) =>
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro:
            erro instanceof Error
              ? erro.message
              : "Falha ao carregar a página de Seller.",
        })),
      );
    setAtualizadoEm(new Date());
    setAtualizando(false);
  }, []);

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

  const itensSom = useMemo(
    () => estado.dado?.sellers.map((s) => ({ id: s.id_user, valor: s.numeros_captados })),
    [estado.dado],
  );
  // Página sempre no mês corrente: chave fixa. Na virada do mês os valores caem, e queda não toca.
  useSomDeRanking(itensSom, "", tocarPlinSeller);

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
      <div data-pagina="seller" className="flex flex-col md:h-full md:min-h-0 md:overflow-hidden">
        <RankingMeta
          titulo="Ranking Seller — Números captados"
          rotuloLista="Ranking Seller"
          itens={dado.sellers.map((s) => ({
            id: s.id_user,
            nome: s.nome,
            valor: s.numeros_captados,
            valorHoje: s.numeros_captados_hoje,
            meta: s.meta,
          }))}
          janela={{ inicio: dado.periodo.inicio, fim: dado.periodo.fim }}
          unidade={{ singular: "número", plural: "números" }}
          legendaHoje="Números de hoje"
          vazio="Nenhum seller ativo."
        />
      </div>
    </>
  );
}
