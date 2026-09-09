import { useCallback, useEffect, useState } from "react";
import { ApiError, buscarComercialCloser, buscarComercialSdr, buscarPessoas } from "../lib/api";
import { Card } from "../componentes/Card";
import { Filtros, useFiltrosAtuais } from "../componentes/Filtros";
import { UltimaAtualizacao } from "../componentes/UltimaAtualizacao";
import { VisaoGeralComercial } from "../componentes/VisaoGeralComercial";
import type { Pessoa, RespostaComercial } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

interface EstadoBloco {
  dado: RespostaComercial | null;
  carregando: boolean;
  erro: string | null;
}

const ESTADO_INICIAL: EstadoBloco = { dado: null, carregando: true, erro: null };

/** cargo da pessoa selecionada, se conhecida — desconhecida não esconde bloco (D12 é otimista na dúvida). */
function cargoDe(pessoasAtivas: Pessoa[], email: string): "sdr" | "closer" | null {
  const pessoa = pessoasAtivas.find((p) => p.email === email);
  if (!pessoa) return null;
  return pessoa.cargo.toLowerCase().includes("sdr") ? "sdr" : "closer";
}

export function Comercial() {
  const { granularidade, periodo, pessoas } = useFiltrosAtuais();
  const [pessoasAtivas, setPessoasAtivas] = useState<Pessoa[]>([]);
  const [sdr, setSdr] = useState<EstadoBloco>(ESTADO_INICIAL);
  const [closer, setCloser] = useState<EstadoBloco>(ESTADO_INICIAL);
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    buscarPessoas().then(setPessoasAtivas).catch(() => setPessoasAtivas([]));
  }, []);

  const carregar = useCallback(async () => {
    setAtualizando(true);
    setSdr((atual) => ({ ...atual, carregando: true }));
    setCloser((atual) => ({ ...atual, carregando: true }));

    const params = { granularidade, periodo, pessoas: pessoas.length > 0 ? pessoas : undefined };

    await Promise.all([
      buscarComercialSdr(params)
        .then((dado) => setSdr({ dado, carregando: false, erro: null }))
        .catch((erro: unknown) =>
          setSdr({ dado: null, carregando: false, erro: erro instanceof ApiError ? erro.message : "Falha ao carregar SDRs." }),
        ),
      buscarComercialCloser(params)
        .then((dado) => setCloser({ dado, carregando: false, erro: null }))
        .catch((erro: unknown) =>
          setCloser({ dado: null, carregando: false, erro: erro instanceof ApiError ? erro.message : "Falha ao carregar Closers." }),
        ),
    ]);

    setAtualizadoEm(new Date());
    setAtualizando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pessoas é array novo a cada render; usar o conteúdo serializado evita loop infinito
  }, [granularidade, periodo, pessoas.join(",")]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, INTERVALO_AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [carregar]);

  // D12: bloco sem nenhuma pessoa selecionada pertencente àquele time some da tela.
  // "Todas" (pessoas vazio) sempre mostra os dois.
  const mostrarSdr = pessoas.length === 0 || pessoas.some((email) => cargoDe(pessoasAtivas, email) !== "closer");
  const mostrarCloser = pessoas.length === 0 || pessoas.some((email) => cargoDe(pessoasAtivas, email) !== "sdr");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filtros pessoasDisponiveis={pessoasAtivas} />
        <UltimaAtualizacao atualizadoEm={atualizadoEm} atualizando={atualizando} aoAtualizar={carregar} />
      </div>

      {mostrarSdr && (
        <Card
          titulo="SDRs"
          carregando={sdr.carregando}
          erro={sdr.erro}
          vazio={sdr.dado?.pessoas.length === 0 && sdr.dado?.avisos.length === 0}
          mensagemVazia="Nenhum número lançado neste período — tente outro período ou outra pessoa nos filtros acima."
        >
          {sdr.dado && (
            <>
              {sdr.dado.periodo_parcial && <p className="mb-3 text-xs text-fg/60">Período em andamento — mês corrente parcial.</p>}
              <VisaoGeralComercial dado={sdr.dado} pessoasSelecionadas={pessoas} />
              {sdr.dado.avisos.length > 0 && (
                <ul className="mt-4 flex flex-col gap-1 border-t border-border-2 pt-3 text-xs text-fg/60">
                  {sdr.dado.avisos.map((aviso) => (
                    <li key={aviso}>⚠ {aviso}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>
      )}

      {mostrarCloser && (
        <Card
          titulo="Closers"
          carregando={closer.carregando}
          erro={closer.erro}
          vazio={closer.dado?.pessoas.length === 0 && closer.dado?.avisos.length === 0}
          mensagemVazia="Nenhum número lançado neste período — tente outro período ou outra pessoa nos filtros acima."
        >
          {closer.dado && (
            <>
              {closer.dado.periodo_parcial && <p className="mb-3 text-xs text-fg/60">Período em andamento — mês corrente parcial.</p>}
              <VisaoGeralComercial dado={closer.dado} pessoasSelecionadas={pessoas} />
              {closer.dado.avisos.length > 0 && (
                <ul className="mt-4 flex flex-col gap-1 border-t border-border-2 pt-3 text-xs text-fg/60">
                  {closer.dado.avisos.map((aviso) => (
                    <li key={aviso}>⚠ {aviso}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
