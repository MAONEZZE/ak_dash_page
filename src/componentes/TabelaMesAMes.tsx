import type { PontoSerieMensal } from "../lib/agregacoes-financeiro";
import { formatarMoeda, formatarNumero } from "../lib/formato";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface LinhaMes {
  rotulo: string;
  valor: (ponto: PontoSerieMensal) => string;
}

const LINHAS: LinhaMes[] = [
  { rotulo: "Contrato bruto vendido", valor: (p) => formatarMoeda(p.vendido) },
  { rotulo: "Recebimento bruto", valor: (p) => formatarMoeda(p.recebimentoBruto) },
  { rotulo: "Liquidou na conta", valor: (p) => formatarMoeda(p.liquidouVendasDoMes) },
  { rotulo: "· pago de parcelas anteriores", valor: (p) => formatarMoeda(p.parcelasAnteriores) },
  { rotulo: "Total recebido no mês", valor: (p) => formatarMoeda(p.totalRecebido) },
  { rotulo: "Nº de contratos fechados", valor: (p) => formatarNumero(p.contratos) },
  { rotulo: "Ticket médio", valor: (p) => (p.ticketMedio === null ? "—" : formatarMoeda(p.ticketMedio)) },
];

interface Props {
  pontos: PontoSerieMensal[];
  total: PontoSerieMensal;
  ano: string;
}

/** Planilha "Resultado mês a mês": uma linha por indicador, uma coluna por mês de `ano` e a coluna Total no fim. */
export function TabelaMesAMes({ pontos, total, ano }: Props) {
  const colunas: { titulo: string; ponto: PontoSerieMensal }[] = [
    ...pontos.map((ponto, i) => ({ titulo: `${MESES[i]}/${ano.slice(2)}`, ponto })),
    { titulo: `Total ${ano}`, ponto: total },
  ];

  return (
    <article className="glass-panel flex min-h-0 w-full min-w-0 flex-col gap-2 rounded-[24px] px-[clamp(14px,1.2vw,21px)] py-[clamp(10px,1.3vh,16px)]">
      <h2 className="font-semibold uppercase leading-none tracking-[0.13em] text-muted text-[clamp(14px,1.6vh,18px)]">Resultado mês a mês</h2>
      {/* Tabela larga rola na horizontal dentro do card, sem empurrar a página. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-auto">
        <table aria-label="Resultado mês a mês" className="w-full flex-1 border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th className="py-[clamp(4px,0.7vh,8px)] pr-3 text-left font-semibold uppercase leading-none tracking-[0.08em] text-muted text-[clamp(10px,1.15vh,13px)]">
                Categoria
              </th>
              {colunas.map((c) => (
                <th
                  key={c.titulo}
                  className="px-3 py-[clamp(4px,0.7vh,8px)] text-right font-semibold uppercase leading-none tracking-[0.08em] text-muted text-[clamp(10px,1.15vh,13px)]"
                >
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((linha) => (
              <tr key={linha.rotulo} className="border-b border-line last:border-0">
                <td className="py-[clamp(3px,0.55vh,7px)] pr-3 font-semibold leading-none tracking-tight text-[clamp(12px,1.45vh,16px)]">{linha.rotulo}</td>
                {colunas.map((c) => (
                  <td
                    key={c.titulo}
                    className="whitespace-nowrap px-3 py-[clamp(3px,0.55vh,7px)] text-right font-display font-bold leading-none tracking-tight text-[clamp(12px,1.45vh,16px)]"
                  >
                    {linha.valor(c.ponto)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
