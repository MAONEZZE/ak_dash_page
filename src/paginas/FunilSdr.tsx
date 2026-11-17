import { useCallback, useEffect, useState } from "react";
import { AvisoFontes } from "../componentes/AvisoFontes";
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

const COLUNAS: ColunaFunil[] = METRICAS_SDR.map((m) => ({ ...m, tipo: "numero" }));

/** Gráfico abre em Inscrições. */
const METRICAS_GRAFICO = [METRICAS_SDR[2], ...METRICAS_SDR.filter((_, i) => i !== 2)];

/** Oportunidades (números captados LinkedIn + Instagram + indicações) → Abordados → Respondido → Inscritos. */
function etapasSdr(f: EtapasFunilSdr): EtapaFunil[] {
  return [
    { rotulo: "Oportunidades", valor: f.oportunidades, passagem: { taxa: razao(f.abordados, f.oportunidades), texto: "abordados" } },
    { rotulo: "Abordados", valor: f.abordados, passagem: { taxa: razao(f.respondidos, f.abordados), texto: "responderam" } },
    { rotulo: "Respondido", valor: f.respondidos, passagem: { taxa: razao(f.inscritos, f.respondidos), texto: "se inscreveram" } },
    { rotulo: "Inscritos", valor: f.inscritos },
  ];
}

function linha(nome: string, m: MetricasSdrFunil): LinhaFunil {
  return { nome, valores: { ...m } };
}

function somar(dado: RespostaFunilSdr): MetricasSdrFunil {
  const soma = Object.fromEntries(METRICAS_SDR_FUNIL.map((k) => [k, 0])) as MetricasSdrFunil;
  for (const s of dado.sdrs) for (const k of METRICAS_SDR_FUNIL) soma[k] += s.metricas[k];
  return soma;
}

interface EstadoFunil {
  dado: RespostaFunilSdr | null;
  carregando: boolean;
  erro: string | null;
}

export function FunilSdr() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const [estado, setEstado] = useState<EstadoFunil>({ dado: null, carregando: true, erro: null });
  const [atualizadoEm, setAtualizadoEm] = useState<Date>(new Date());
  const [atualizando, setAtualizando] = useState(false);
  const { registrar } = useAtualizacao();

  // No `catch`, mantém o `dado` já carregado: um refresh que falhou não apaga a tela.
  const carregar = useCallback(async () => {
    setAtualizando(true);
    setEstado((atual) => ({ ...atual, carregando: true }));
    await buscarFunilSdr({ granularidade, periodo })
      .then((dado) => setEstado({ dado, carregando: false, erro: null }))
      .catch((erro: unknown) =>
        setEstado((atual) => ({
          ...atual,
          carregando: false,
          erro: erro instanceof Error ? erro.message : "Falha ao carregar o funil de SDR.",
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

  const { evento } = dado;
  const reunioes = dado.metricas_time.find((m) => m.metrica === "reunioes_agendadas");

  return (
    <div className="flex flex-col gap-6">
      <AvisoFontes avisos={dado.avisos} />
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
            valor={evento?.inscritos ?? 0}
            meta={evento?.capacidade ?? null}
            fonte={
              evento
                ? { titulo: evento.titulo, data: formatarDataHoraEvento(evento.data) }
                : { titulo: "Nenhuma Confraria agendada" }
            }
          />
        }
      />
      <section aria-label="Reuniões e inscrições do evento" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {reunioes && (
          <CardKpi
            label="Reuniões Agendadas"
            value={formatarNumero(reunioes.realizado)}
            meta={reunioes.meta_periodo === null ? undefined : formatarNumero(reunioes.meta_periodo)}
            atingimento={{
              realizado: reunioes.realizado,
              meta: reunioes.meta_periodo,
              pct: reunioes.pct_atingimento,
              faltaFolga: reunioes.falta_folga,
            }}
          />
        )}
        {evento && (
          <>
            <CardKpi label="Aprovados" value={formatarNumero(evento.aprovados)} />
            <CardKpi label="Pendentes" value={formatarNumero(evento.pendentes)} />
            <CardKpi label="Rejeitados" value={formatarNumero(evento.rejeitados)} />
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
      <GraficoContasFunil titulo="Evolução por SDR" contas={dado.sdrs} periodo={dado.periodo} metricas={METRICAS_GRAFICO} />
    </div>
  );
}
