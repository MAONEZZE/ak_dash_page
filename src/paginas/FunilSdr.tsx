import { useCallback, useEffect, useState } from "react";
import { AvisoFontes } from "../componentes/AvisoFontes";
import { Avatar } from "../componentes/Avatar";
import { CardEsqueleto } from "../componentes/CardEsqueleto";
import { CardKpi } from "../componentes/CardKpi";
import { FunilBarras, type EtapaFunil } from "../componentes/FunilBarras";
import { GraficoContasFunil } from "../componentes/GraficoContasFunil";
import { TabelaContasFunil } from "../componentes/TabelaContasFunil";
import { Velocimetro } from "../componentes/Velocimetro";
import { buscarFunilSdr } from "../lib/api";
import { useAtualizacao } from "../lib/atualizacao";
import { razao, type ColunaFunil, type LinhaFunil } from "../lib/funil";
import { formatarDataHoraEvento, formatarNumero } from "../lib/formato";
import { useEventoSelecionado } from "../componentes/PillEvento";
import { useFiltrosAtuais } from "../lib/periodo";
import {
  METRICAS_SDR_FUNIL,
  type EtapasFunilSdr,
  type MetricaSdrFunil,
  type MetricasSdrFunil,
  type RespostaFunilSdr,
} from "../lib/tipos-api";

const INTERVALO_AUTO_REFRESH_MS = 60_000;

/** Colunas das abas por pessoa da planilha de SDRs, na ordem delas. */
const METRICAS_SDR: { chave: MetricaSdrFunil; rotulo: string }[] = [
  { chave: "abordagens", rotulo: "Abordagens" },
  { chave: "respondidos", rotulo: "Responderam" },
  { chave: "inscricoes_realizadas", rotulo: "Inscrições Realizadas" },
  { chave: "indicacoes", rotulo: "Indicações Captadas" },
  { chave: "reunioes_agendadas", rotulo: "Reuniões Agendadas" },
];

const COLUNAS: ColunaFunil[] = METRICAS_SDR.map((m) => ({
  ...m,
  tipo: "numero",
}));

/** Gráfico abre em Inscrições. */
const METRICAS_GRAFICO = [
  METRICAS_SDR[2],
  ...METRICAS_SDR.filter((_, i) => i !== 2),
];

/** Oportunidades (números captados LinkedIn + Instagram + indicações) → Abordados → Respondido → Inscritos. */
function etapasSdr(f: EtapasFunilSdr): EtapaFunil[] {
  return [
    {
      rotulo: "Oportunidades",
      valor: f.oportunidades,
      passagem: {
        taxa: razao(f.abordados, f.oportunidades),
        texto: "abordados",
      },
    },
    {
      rotulo: "Abordados",
      valor: f.abordados,
      passagem: {
        taxa: razao(f.respondidos, f.abordados),
        texto: "responderam",
      },
    },
    {
      rotulo: "Respondido",
      valor: f.respondidos,
      passagem: {
        taxa: razao(f.inscritos, f.respondidos),
        texto: "se inscreveram",
      },
    },
    { rotulo: "Inscritos", valor: f.inscritos },
  ];
}

function linha(nome: string, m: MetricasSdrFunil): LinhaFunil {
  return { nome, valores: { ...m } };
}

/** SDRs com card próprio de inscrições do período (aba da planilha de cada um). */
const SDRS_COM_CARD = ["Juca", "Jennifer"];

function somar(dado: RespostaFunilSdr): MetricasSdrFunil {
  const soma = Object.fromEntries(
    METRICAS_SDR_FUNIL.map((k) => [k, 0]),
  ) as MetricasSdrFunil;
  for (const s of dado.sdrs)
    for (const k of METRICAS_SDR_FUNIL) soma[k] += s.metricas[k];
  return soma;
}

interface EstadoFunil {
  dado: RespostaFunilSdr | null;
  carregando: boolean;
  erro: string | null;
}

export function FunilSdr() {
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
    await buscarFunilSdr({ granularidade, periodo, evento })
      .then((dado) => setEstado({ dado, carregando: false, erro: null }))
      .catch((erro: unknown) =>
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro:
            erro instanceof Error
              ? erro.message
              : "Falha ao carregar o funil de SDR.",
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

  const cardsSdr = SDRS_COM_CARD.map((nome) => ({
    nome,
    sdr: dado.sdrs.find(
      (s) => s.nome.trim().toLowerCase() === nome.toLowerCase(),
    ),
  }));

  return (
    <div className="flex flex-col gap-6">
      <AvisoFontes avisos={dado.avisos} />
      {/* Escala só nesta página (FunilBarras/CardKpi são compartilhados): topo 1,5× menor e depois 1,7× maior (≈1,13×), KPIs 1,5× maiores. */}
      {/* Só as etapas do funil (dentro do card Funil SDR) 1,5× maiores: zoom 0,84 × 1,5 (altura e texto) e largura 60% × 1,5 do card. */}
      <div
        style={{ zoom: (2 / 3) * 1.7 }}
        className="[&_ol]:[zoom:1.26] [&_[data-linha-etapa]]:max-w-[90%]"
      >
        <FunilBarras
          titulo="Funil SDR"
          etapas={etapasSdr(dado.funil)}
          conversaoTotal={razao(dado.funil.inscritos, dado.funil.oportunidades)}
          lateral={{
            rotulo: "Oportunidades",
            texto: `${formatarNumero(dado.funil.numeros_captados)} números + ${formatarNumero(dado.funil.indicacoes)} indicações`,
            aoLadoDe: 0,
          }}
          aoLado={
            <Velocimetro
              rotulo="Inscrições Realizadas"
              valor={dado.evento?.inscritos_periodo ?? 0}
              meta={dado.evento?.capacidade ?? null}
              fonte={
                dado.evento
                  ? {
                      titulo: dado.evento.titulo,
                      data: formatarDataHoraEvento(dado.evento.data),
                    }
                  : { titulo: "Nenhum evento agendado" }
              }
            />
          }
        />
      </div>
      <section
        aria-label="Inscrições por SDR e do evento"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {cardsSdr.map(({ nome, sdr }) => (
          <Velocimetro
            key={nome}
            tamanho="compacto"
            foto={
              <Avatar
                nome={nome}
                imagemUrl={sdr?.imagem_url ?? null}
                tamanho={56}
              />
            }
            rotulo={`Inscrições ${nome}`}
            valor={sdr?.metricas.inscricoes_realizadas ?? 0}
            meta={sdr?.meta_inscricoes ?? null}
          />
        ))}
        {dado.evento && (
          <>
            <CardKpi
              valorCentral
              label="Pendentes"
              value={formatarNumero(dado.evento.pendentes)}
            />
            <CardKpi
              valorCentral
              label="Inscrições Realizadas"
              subtitulo="somatório fixo"
              value={formatarNumero(dado.evento.inscritos)}
            />
          </>
        )}
      </section>
      <TabelaContasFunil
        titulo="Por SDR"
        rotuloConta="SDR"
        colunas={COLUNAS}
        linhas={dado.sdrs.map((s) => linha(s.nome, s.metricas))}
        total={linha("TOTAL", somar(dado))}
      />
      <GraficoContasFunil
        titulo="Evolução por SDR"
        contas={dado.sdrs}
        periodo={dado.periodo}
        metricas={METRICAS_GRAFICO}
      />
    </div>
  );
}
