import { useCallback, useEffect, useState } from "react";
import { AvisoFontes } from "../componentes/AvisoFontes";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { CardKpi } from "../componentes/CardKpi";
import { FunilBarras } from "../componentes/FunilBarras";
import type { EtapaFunil } from "../componentes/FunilBarras";
import { GraficoContasFunil } from "../componentes/GraficoContasFunil";
import { MiniFunisContas } from "../componentes/MiniFunisContas";
import { PillConta, useContaSelecionada } from "../componentes/PillConta";
import { TabelaContasFunil } from "../componentes/TabelaContasFunil";
import { Velocimetro } from "../componentes/Velocimetro";
import { buscarFunil } from "../lib/api";
import { COLUNAS_INSTAGRAM, linhaInstagram, somarContas, taxasInstagram, umaCasa } from "../lib/funil";
import { useAtualizacao } from "../lib/atualizacao";
import { formatarNumero } from "../lib/formato";
import { useFiltrosAtuais } from "../lib/periodo";
import type { MetricaConta, MetricasConta, RespostaFunil } from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

/** Opções do dropdown do gráfico por conta, na ordem do funil e da tabela. */
const METRICAS_GRAFICO_INSTAGRAM: { chave: MetricaConta; rotulo: string }[] = [
  { chave: "abordagens", rotulo: "Abordagens feitas" },
  { chave: "respondidos", rotulo: "Respondidos" },
  { chave: "numeros_captados", rotulo: "Números Captados" },
  { chave: "fups", rotulo: "Follow-ups" },
  { chave: "indicacoes", rotulo: "Indicações Captadas" },
];

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
      {dado && (
        <header className="flex flex-col gap-3">
          <PillConta rotulo="Perfil" contas={dado.contas.map((c) => c.nome)} />
        </header>
      )}

      {!dado ? (
        erro ? (
          <p className="text-xl text-muted" role="alert">
            {erro}
          </p>
        ) : (
          <>
            <CardEsqueleto className="min-h-[280px]" />
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }, (_, i) => (
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

function etapasInstagram(m: MetricasConta): EtapaFunil[] {
  const t = taxasInstagram(m);
  return [
    {
      rotulo: "Abordagens feitas",
      valor: m.abordagens,
      passagem: { taxa: t.resposta, texto: "responderam" },
    },
    {
      rotulo: "Respondidos",
      valor: m.respondidos,
      passagem: { taxa: t.conversaoNumero, texto: "viraram número" },
    },
    { rotulo: "Números Captados", valor: m.numeros_captados },
  ];
}

function Conteudo({ dado, conta }: { dado: RespostaFunil; conta: string | null }) {
  const m = somarContas(dado.contas, conta, dado.sem_conta);
  const t = taxasInstagram(m);

  return (
    <>
      <AvisoFontes avisos={dado.avisos} />
      <FunilBarras
        titulo="Funil Instagram"
        rotuloNoCanto
        conversaoTotal={t.conversaoTotal}
        aoLado={
          <Velocimetro
            rotulo="Números Captados"
            valor={somarContas(dado.contas, null, dado.sem_conta).numeros_captados}
            meta={dado.meta_numeros_captados}
          />
        }
        etapas={etapasInstagram(m)}
        lateral={{
          rotulo: "Follow-ups",
          texto:
            t.fupsPorAbordagem === null
              ? formatarNumero(m.fups)
              : `${formatarNumero(m.fups)} (${umaCasa(t.fupsPorAbordagem)} por abordagem)`,
          aoLadoDe: 1,
          formato: "card",
        }}
      />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CardKpi label="Follow-ups" value={formatarNumero(m.fups)} />
        <CardKpi label="Indicações Captadas" value={formatarNumero(m.indicacoes)} />
      </section>
      <MiniFunisContas
        titulo="Funil por perfil"
        contas={dado.contas.map((c) => ({
          nome: c.nome,
          etapas: etapasInstagram(c.metricas),
          conversaoTotal: taxasInstagram(c.metricas).conversaoTotal,
        }))}
      />
      <TabelaContasFunil
        titulo="Por perfil"
        rotuloConta="Perfil"
        colunas={COLUNAS_INSTAGRAM}
        linhas={dado.contas.map((c) => linhaInstagram(c.nome, c.metricas))}
        total={linhaInstagram("TOTAL", somarContas(dado.contas, null, dado.sem_conta))}
        destacada={conta}
      />
      <GraficoContasFunil contas={dado.contas} periodo={dado.periodo} metricas={METRICAS_GRAFICO_INSTAGRAM} />
    </>
  );
}
