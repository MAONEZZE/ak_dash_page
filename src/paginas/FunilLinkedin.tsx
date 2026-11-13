import { useCallback, useEffect, useState } from "react";
import { AvisoFontes } from "../componentes/AvisoFontes";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { BlocoDashboardFunil } from "../componentes/BlocoDashboardFunil";
import { CardKpi } from "../componentes/CardKpi";
import { FunilEscada } from "../componentes/FunilEscada";
import { GraficoBarrasContas } from "../componentes/GraficoBarrasContas";
import { PillConta, useContaSelecionada } from "../componentes/PillConta";
import { TabelaContasFunil } from "../componentes/TabelaContasFunil";
import { buscarFunil } from "../lib/api";
import { COLUNAS_LINKEDIN, diasUteisRestantes, linhaLinkedin, somarContas, formatarTaxa, taxasLinkedin, umaCasa } from "../lib/funil";
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

export function FunilLinkedin() {
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
    await buscarFunil("linkedin", { granularidade, periodo })
      .then((dado) => setEstado({ dado, carregando: false, erro: null }))
      .catch((erro: unknown) =>
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro: erro instanceof Error ? erro.message : "Falha ao carregar o funil do LinkedIn.",
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
          Painel de acompanhamento do funil de prospecção LinkedIn
        </h1>
        {dado && (
          <>
            <p className="text-lg text-muted">Consolidado de {listarNomes(dado.contas.map((c) => c.nome))}</p>
            <PillConta rotulo="LinkedIn" contas={dado.contas.map((c) => c.nome)} />
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
  const t = taxasLinkedin(m);

  return (
    <>
      <AvisoFontes avisos={dado.avisos} />
      <FunilEscada
        titulo="Funil LinkedIn"
        etapas={[
          { rotulo: "Conexões Enviadas", valor: m.conexoes_enviadas, passagem: { taxa: t.aceitacao, texto: "aceitaram" } },
          { rotulo: "Conexões Aceitas", valor: m.conexoes_aceitas, passagem: { taxa: t.abordados, texto: "abordados" } },
          { rotulo: "Mensagem de Abordagem", valor: m.mensagens_abordagem, passagem: { taxa: t.resposta, texto: "responderam" } },
          { rotulo: "Respondidos", valor: m.respondidos, passagem: { taxa: t.conversaoNumero, texto: "viraram número" } },
          { rotulo: "Números Captados", valor: m.numeros_captados },
        ]}
        lateral={{
          rotulo: "Follow de abordagem",
          texto: `${formatarNumero(m.follows_abordagem)} (${umaCasa(t.followsPorAbordagem)} por abordagem)`,
          aoLadoDe: 2,
        }}
      />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CardKpi label="Conversão total do funil" value={formatarTaxa(t.conversaoTotal)} />
        <CardKpi label="Abordagens + Follows" value={formatarNumero(m.abordagens)} />
        <CardKpi label="InMails enviados" value={formatarNumero(m.in_mails)} />
        <CardKpi label="Follow-ups" value={formatarNumero(m.fups)} />
      </section>
      <TabelaContasFunil
        titulo="Por LinkedIn"
        rotuloConta="LinkedIn"
        colunas={COLUNAS_LINKEDIN}
        linhas={dado.contas.map((c) => linhaLinkedin(c.nome, c.metricas))}
        total={linhaLinkedin("TOTAL", somarContas(dado.contas, null))}
        destacada={conta}
      />
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <GraficoBarrasContas
          titulo="Volume por LinkedIn"
          orientacao="horizontal"
          formato="numero"
          ordenar="crescente"
          dados={dado.contas.map((c) => ({ nome: c.nome, valor: c.metricas.conexoes_enviadas }))}
          destacada={conta}
        />
        <GraficoBarrasContas
          titulo="Taxa de conversão por LinkedIn"
          orientacao="vertical"
          formato="taxa"
          dados={dado.contas.map((c) => ({ nome: c.nome, valor: taxasLinkedin(c.metricas).conversaoTotal }))}
          destacada={conta}
        />
      </section>
      <BlocoDashboardFunil dashboard={dado.dashboard} diasUteisRestantes={diasUteisRestantes(new Date())} />
    </>
  );
}
