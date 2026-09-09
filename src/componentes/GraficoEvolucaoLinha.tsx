import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { serieDoTimePorMetrica } from "../lib/insights";
import type { Metrica, SerieDiariaDia } from "../lib/tipos-api";

interface Props {
  serieDiaria: SerieDiariaDia[];
  /** Uma ocorrência de cada métrica disponível (só pra tirar chave+nome_exibicao) — vem de qualquer pessoa. */
  metricasDisponiveis: Metrica[];
}

export function GraficoEvolucaoLinha({ serieDiaria, metricasDisponiveis }: Props) {
  const [metricaSelecionada, setMetricaSelecionada] = useState(metricasDisponiveis[0]?.metrica ?? "");

  if (serieDiaria.length === 0 || metricasDisponiveis.length === 0) {
    return <p className="text-sm text-fg/60">Sem evolução diária pro período selecionado (só cobre o mês corrente).</p>;
  }

  const dados = serieDoTimePorMetrica(serieDiaria, metricaSelecionada);
  const nomeExibicao = metricasDisponiveis.find((m) => m.metrica === metricaSelecionada)?.nome_exibicao ?? metricaSelecionada;

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-xs text-fg/70">
        Métrica
        <select
          value={metricaSelecionada}
          onChange={(e) => setMetricaSelecionada(e.target.value)}
          className="rounded-md border border-border-2 bg-bg-2 px-2 py-1 text-sm text-fg"
        >
          {metricasDisponiveis.map((m) => (
            <option key={m.metrica} value={m.metrica}>
              {m.nome_exibicao}
            </option>
          ))}
        </select>
      </label>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-2)" vertical={false} />
            <XAxis dataKey="dia" stroke="var(--color-border-2)" tick={{ fill: "var(--color-fg)", fontSize: 11, opacity: 0.6 }} />
            <YAxis stroke="var(--color-border-2)" tick={{ fill: "var(--color-fg)", fontSize: 11, opacity: 0.6 }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(dia: number) => `Dia ${dia}`}
              formatter={(valor: number) => [valor, nomeExibicao]}
              contentStyle={{ background: "var(--color-bg-2)", border: "1px solid var(--color-border-2)", borderRadius: 6, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="valor" stroke="var(--color-accent-fg)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
