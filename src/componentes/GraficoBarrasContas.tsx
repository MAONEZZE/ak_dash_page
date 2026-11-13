import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { formatarNumero } from "../lib/formato";
import { formatarTaxa } from "../lib/funil";

interface Props {
  titulo: string;
  dados: { nome: string; valor: number | null }[];
  orientacao: "horizontal" | "vertical";
  formato: "numero" | "taxa";
  /** Só crescente: a conta de menor valor fica primeiro (null conta como 0). */
  ordenar?: "crescente";
  /** Conta em destaque: barra cheia; as demais ficam esmaecidas. Sem destaque, todas cheias. */
  destacada?: string | null;
}

const ALTURA_GRAFICO = 260;
/** Opacidade das barras não destacadas — `fillOpacity` em vez de `fill-brand/NN`, que vira `color-mix` (sem suporte no Chromium 94 da TV). */
const OPACIDADE_ESMAECIDA = 0.35;

function formatar(valor: number | null, formato: Props["formato"]): string {
  if (formato === "taxa") return formatarTaxa(valor);
  return valor === null ? "—" : formatarNumero(valor);
}

/**
 * Barras de um valor por conta, com tabela sr-only logo abaixo na mesma ordem
 * plotada — a figura inteira é o acessível (`aria-label` = título).
 */
export function GraficoBarrasContas({ titulo, dados, orientacao, formato, ordenar, destacada }: Props) {
  const plotados = ordenar === "crescente" ? [...dados].sort((a, b) => (a.valor ?? 0) - (b.valor ?? 0)) : dados;
  const temDestaque = !!destacada;

  return (
    <figure aria-label={titulo} className="glass-panel flex min-w-0 flex-col gap-3 rounded-[24px] p-5">
      <figcaption className="text-lg font-semibold text-fg">{titulo}</figcaption>

      <ResponsiveContainer width="100%" height={ALTURA_GRAFICO}>
        <BarChart data={plotados} layout={orientacao === "horizontal" ? "vertical" : "horizontal"}>
          {orientacao === "horizontal" ? (
            <>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="nome" width={90} tick={{ className: "fill-muted text-[13px]" }} tickLine={false} axisLine={false} />
            </>
          ) : (
            <>
              <XAxis type="category" dataKey="nome" tick={{ className: "fill-muted text-[13px]" }} tickLine={false} axisLine={false} />
              <YAxis type="number" hide />
            </>
          )}
          <Bar dataKey="valor" className="fill-brand">
            {plotados.map((d) => (
              <Cell
                key={d.nome}
                className="fill-brand"
                fillOpacity={!temDestaque || d.nome === destacada ? 1 : OPACIDADE_ESMAECIDA}
              />
            ))}
            <LabelList
              dataKey="valor"
              position={orientacao === "horizontal" ? "right" : "top"}
              formatter={(v: unknown) => formatar(typeof v === "number" ? v : null, formato)}
              className="fill-fg text-[13px] font-semibold"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Conta</th>
            <th scope="col">Valor</th>
          </tr>
        </thead>
        <tbody>
          {plotados.map((d) => (
            <tr key={d.nome}>
              <td>{d.nome}</td>
              <td>{formatar(d.valor, formato)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
