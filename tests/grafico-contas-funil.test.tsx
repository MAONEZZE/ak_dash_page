// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { GraficoContasFunil } from "../src/componentes/GraficoContasFunil";
import { METRICAS_CONTA, type ContaFunil, type MetricasConta } from "../src/lib/tipos-api";

afterEach(cleanup);

const ZERO = Object.fromEntries(METRICAS_CONTA.map((m) => [m, 0])) as MetricasConta;

function conta(nome: string, dias: [string, Partial<MetricasConta>][]): ContaFunil {
  return { id_conta: nome, nome, metricas: ZERO, serie: dias.map(([data, m]) => ({ data, metricas: { ...ZERO, ...m } })) };
}

const contas = [
  conta("Jacob", [["2026-11-02", { conexoes_enviadas: 40, numeros_captados: 3 }]]),
  conta("Alex", [["2026-11-03", { conexoes_enviadas: 10, numeros_captados: 7 }]]),
];

const metricas = [
  { chave: "conexoes_enviadas", rotulo: "Conexões Enviadas" },
  { chave: "numeros_captados", rotulo: "Números Captados" },
] as const;

function montar() {
  render(
    <GraficoContasFunil
      contas={contas}
      periodo={{ granularidade: "mes", inicio: "2026-11-01", fim: "2026-11-30" }}
      metricas={[...metricas]}
      hoje={new Date(2026, 10, 3, 12)}
    />,
  );
}

it("desenha uma linha por conta, com legenda, eixo X do período e eixo Y de metade em metade", () => {
  montar();

  const grafico = screen.getByRole("figure", { name: "Evolução por conta" });
  expect(grafico.querySelectorAll("[data-linha]")).toHaveLength(2);
  expect(within(screen.getByRole("list", { name: "Contas" })).getAllByRole("listitem").map((i) => i.textContent)).toEqual([
    "Jacob",
    "Alex",
  ]);
  expect([...grafico.querySelectorAll("[data-rotulo-x]")].map((r) => r.textContent)).toEqual(["01/11", "02/11", "03/11"]);
  expect([...grafico.querySelectorAll("[data-rotulo-y]")].map((r) => r.textContent)).toEqual(["40", "20", "0"]);
});

it("o dropdown troca a métrica exibida", () => {
  montar();

  const seletor = screen.getByRole("combobox", { name: "Métrica" }) as HTMLSelectElement;
  expect(seletor.value).toBe("conexoes_enviadas");
  expect(within(seletor).getAllByRole("option").map((o) => o.textContent)).toEqual(["Conexões Enviadas", "Números Captados"]);

  fireEvent.change(seletor, { target: { value: "numeros_captados" } });

  const grafico = screen.getByRole("figure", { name: "Evolução por conta" });
  expect([...grafico.querySelectorAll("[data-rotulo-y]")].map((r) => r.textContent)).toEqual(["8", "4", "0"]);
});
