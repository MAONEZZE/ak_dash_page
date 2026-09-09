import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { deltaPorMetrica } from "../lib/insights";
import type { PessoaComercial } from "../lib/tipos-api";

interface Props {
  pessoas: PessoaComercial[];
}

/** Barra divergente: % de distância da meta por métrica, time inteiro somado. */
export function GraficoMetaBarra({ pessoas }: Props) {
  const dados = deltaPorMetrica(pessoas)
    .filter((d) => d.deltaPercentual !== null)
    .sort((a, b) => (b.deltaPercentual as number) - (a.deltaPercentual as number));

  if (dados.length === 0) {
    return <p className="text-sm text-fg/60">Sem meta cadastrada pra comparar no período.</p>;
  }

  const altura = Math.max(dados.length * 32, 120);

  return (
    <div style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <XAxis
            type="number"
            tickFormatter={(v: number) => `${v}%`}
            stroke="var(--color-border-2)"
            tick={{ fill: "var(--color-fg)", fontSize: 11, opacity: 0.6 }}
          />
          <YAxis
            type="category"
            dataKey="nomeExibicao"
            width={140}
            stroke="var(--color-border-2)"
            tick={{ fill: "var(--color-fg)", fontSize: 11, opacity: 0.8 }}
          />
          <ReferenceLine x={0} stroke="var(--color-border-2)" />
          <Tooltip
            formatter={(valor: number) => [`${valor > 0 ? "+" : ""}${valor}%`, "vs. meta"]}
            contentStyle={{ background: "var(--color-bg-2)", border: "1px solid var(--color-border-2)", borderRadius: 6, fontSize: 12 }}
          />
          <Bar dataKey="deltaPercentual" radius={4}>
            {dados.map((d) => (
              <Cell key={d.metrica} className={d.deltaPercentual! >= 0 ? "fill-status-good" : "fill-status-bad"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
