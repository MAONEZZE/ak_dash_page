import { useCallback, useEffect, useState } from "react";
import { AvisoFontes } from "../componentes/AvisoFontes";
import { BlocoDashboardFunil } from "../componentes/BlocoDashboardFunil";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { CardKpi } from "../componentes/CardKpi";
import { FunilEscada } from "../componentes/FunilEscada";
import { PillConta, useContaSelecionada } from "../componentes/PillConta";
import { TabelaContasFunil } from "../componentes/TabelaContasFunil";
import { buscarFunil } from "../lib/api";
import { COLUNAS_INSTAGRAM, diasUteisRestantes, linhaInstagram, somarContas, formatarTaxa, taxasInstagram, umaCasa } from "../lib/funil";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarNumero } from "../lib/formato";
import { useFiltrosAtuais } from "../lib/periodo";
import type { RespostaFunil } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

interface EstadoFunil {
  dado: RespostaFunil | null;
  carregando: boolean;
  erro: string | null;
}

/** Nomes das contas: "A, B e C". */
function listarNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

export function FunilInstagram() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const conta = useContaSelecionada();
  const [estado, setEstado] = useState<EstadoFunil>({ dado: null, carregando: true, erro: null });
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const { registrar } = useAtualizacao();

  // No `catch`, mantém o `dado` já carregado — um refresh que falhou não apaga a tela.
  const carregar = useCallback(async () => {
    setAtualizando(true);
    setEstado((atual) => ({ ...atual, carregando: true }));
    await buscarFunil("instagram", { granularidade, periodo })
      .then((dado) => setEstado({ dado, carregando: false, erro: null }))
      .catch((erro: unknown) =>
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro: erro instanceof Error ? erro.message : "Falha ao carregar o funil do Instagram.",
        })),
      );
    setAtualizadoEm(new Date());
    setAtualizando(false);
  }, [granularidade, periodo]);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, INTERVALO_AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [carregar]);

  // Header vive fora da árvore desta página (App.tsx): repassa o "Atualizar".
  useEffect(() => {
    registrar({ atualizadoEm, atualizando, aoAtualizar: carregar });
    return () => registrar({ atualizadoEm: null, atualizando: false, aoAtualizar: null });
  }, [atualizadoEm, atualizando, carregar, registrar]);

  const { dado, erro } = estado;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-[15px] font-semibold uppercase tracking-[0.13em] text-muted">
          Painel de acompanhamento do funil de prospecção Instagram
        </h1>
        {dado && (
          <>
            <p className="text-lg text-muted">Consolidado de {listarNomes(dado.contas.map((c) => c.nome))}</p>
            <PillConta rotulo="Perfil" contas={dado.contas.map((c) => c.nome)} />
          </>
        )}
      </header>

      {!dado ? (
        erro ? (
          <p className="text-xl text-muted" role="alert">
            {erro}
          </p>
        ) : (
          <>
            <CardEsqueleto className="min-h-[280px]" />
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <CardEsqueleto key={i} className="min-h-[168px]" />
              ))}
            </section>
          </>
        )
      ) : (
        <Conteudo dado={dado} conta={conta} />
      )}
    </div>
  );
}

function Conteudo({ dado, conta }: { dado: RespostaFunil; conta: string | null }) {
  const m = somarContas(dado.contas, conta);
  const t = taxasInstagram(m);

  return (
    <>
      <AvisoFontes avisos={dado.avisos} />
      <FunilEscada
        titulo="Funil Instagram"
        etapas={[
          { rotulo: "Abordagens feitas", valor: m.abordagens, passagem: { taxa: t.resposta, texto: "responderam" } },
          { rotulo: "Respondidos", valor: m.respondidos, passagem: { taxa: t.conversaoNumero, texto: "viraram número" } },
          { rotulo: "Números Captados", valor: m.numeros_captados },
        ]}
        lateral={{
          rotulo: "Follow-ups",
          texto: `${formatarNumero(m.fups)} (${umaCasa(t.fupsPorAbordagem)} por abordagem)`,
          aoLadoDe: 0,
        }}
      />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CardKpi label="Conversão total do funil" value={formatarTaxa(t.conversaoTotal)} />
        <CardKpi label="Follow-ups" value={formatarNumero(m.fups)} />
        <CardKpi label="Indicações Captadas" value={formatarNumero(m.indicacoes)} />
        <CardKpi label="Taxa de resposta" value={formatarTaxa(t.resposta)} />
      </section>
      <TabelaContasFunil
        titulo="Por perfil"
        rotuloConta="Perfil"
        colunas={COLUNAS_INSTAGRAM}
        linhas={dado.contas.map((c) => linhaInstagram(c.nome, c.metricas))}
        total={linhaInstagram("TOTAL", somarContas(dado.contas, null))}
        destacada={conta}
      />
      <BlocoDashboardFunil dashboard={dado.dashboard} diasUteisRestantes={diasUteisRestantes(new Date())} />
    </>
  );
}
