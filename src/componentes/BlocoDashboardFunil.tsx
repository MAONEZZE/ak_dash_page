import { formatarNumero } from "../lib/formato";
import { umaCasa } from "../lib/funil";
import type { DashboardFunil, FaltaFolga, MediaNecessaria, MetricaTime } from "../lib/tipos-api";

interface Coluna {
  rotulo: string;
  celula: (linha: MetricaTime) => string;
}

function formatarNumeroOpcional(valor: number | null): string {
  return valor === null ? "—" : formatarNumero(valor);
}

function formatarFaltaFolga(faltaFolga: FaltaFolga | null): string {
  if (faltaFolga === null) return "—";
  return `${faltaFolga.tipo === "falta" ? "Falta" : "Folga"} ${formatarNumero(faltaFolga.valor)}`;
}

function formatarMediaNecessaria(media: MediaNecessaria | null): string {
  if (media === null) return "—";
  switch (media.situacao) {
    case "pendente":
      return umaCasa(media.valor);
    case "meta_batida":
      return "Meta batida";
    case "expediente_encerrado":
      return "Expediente encerrado";
    case "periodo_encerrado":
      return "Período encerrado";
  }
}

const COLUNAS_BASE: Coluna[] = [
  { rotulo: "Métrica", celula: (linha) => linha.nome_exibicao },
  { rotulo: "Meta", celula: (linha) => formatarNumeroOpcional(linha.meta_periodo) },
  { rotulo: "Realizado", celula: (linha) => formatarNumero(linha.realizado) },
  {
    rotulo: "% de atingimento",
    celula: (linha) => (linha.pct_atingimento === null ? "—" : `${umaCasa(linha.pct_atingimento)}%`),
  },
  { rotulo: "Falta / Folga", celula: (linha) => formatarFaltaFolga(linha.falta_folga) },
];

const COLUNAS_DIARIO: Coluna[] = [
  { rotulo: "Horas restantes", celula: (linha) => umaCasa(linha.horas_restantes) },
  { rotulo: "Média necessária por hora", celula: (linha) => formatarMediaNecessaria(linha.media_necessaria) },
];

function colunasDiasUteis(diasUteisRestantes: number | null): Coluna[] {
  return [
    { rotulo: "Dias úteis restantes", celula: () => formatarNumeroOpcional(diasUteisRestantes) },
    { rotulo: "Média necessária por dia", celula: (linha) => formatarMediaNecessaria(linha.media_necessaria) },
  ];
}

const COLUNA_PREVISAO: Coluna = { rotulo: "Previsão", celula: (linha) => umaCasa(linha.previsao) };

function TabelaDashboard({ titulo, linhas, colunas }: { titulo: string; linhas: MetricaTime[]; colunas: Coluna[] }) {
  const todasColunas = [...COLUNAS_BASE, ...colunas];
  return (
    <article className="glass-panel rounded-[24px] p-5">
      <h3 className="font-display text-[18px] font-bold tracking-tight">{titulo}</h3>
      <table aria-label={titulo} className="mt-3 w-full text-left text-[13px]">
        <thead>
          <tr>
            {todasColunas.map((coluna) => (
              <th key={coluna.rotulo} scope="col" className="px-2 py-1.5 font-semibold">
                {coluna.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.metrica}>
              {todasColunas.map((coluna) => (
                <td key={coluna.rotulo} className="px-2 py-1.5 tabular-nums">
                  {coluna.celula(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

export function BlocoDashboardFunil({
  dashboard,
  diasUteisRestantes,
}: {
  dashboard: DashboardFunil;
  diasUteisRestantes?: { semanal: number | null; mensal: number | null };
}) {
  const { seller } = dashboard;

  return (
    <section aria-label="Dashboard" className="flex flex-col gap-4">
      {seller === null ? (
        <p>Nenhum seller ligado a este canal.</p>
      ) : (
        <>
          <h2 className="font-display text-[24px] font-bold tracking-tight">Dashboard · {seller.nome}</h2>
          <TabelaDashboard titulo="Diário" linhas={dashboard.diario} colunas={COLUNAS_DIARIO} />
          <TabelaDashboard
            titulo="Semanal"
            linhas={dashboard.semanal}
            colunas={colunasDiasUteis(diasUteisRestantes?.semanal ?? null)}
          />
          <TabelaDashboard
            titulo="Mensal"
            linhas={dashboard.mensal}
            colunas={[...colunasDiasUteis(diasUteisRestantes?.mensal ?? null), COLUNA_PREVISAO]}
          />
        </>
      )}
    </section>
  );
}
