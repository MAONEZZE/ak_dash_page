// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { GraficoBarrasContas } from "../src/componentes/GraficoBarrasContas";
import { formatarTaxa } from "../src/lib/funil";
import { formatarNumero } from "../src/lib/formato";

afterEach(() => cleanup());

/** Linhas do corpo da tabela como listas de células (sem o cabeçalho). */
function celulasDoCorpo(tabela: HTMLElement): string[][] {
  return within(tabela)
    .getAllByRole("row")
    .slice(1)
    .map((linha) => Array.from(linha.querySelectorAll("td")).map((c) => c.textContent ?? ""));
}

it("ordena crescente quando pedido e expõe os dados em tabela acessível", () => {
  const dados = [
    { nome: "Jacob", valor: 381 },
    { nome: "Alex", valor: 165 },
    { nome: "Leticia", valor: 395 },
  ];
  render(
    <GraficoBarrasContas
      titulo="Volume por LinkedIn"
      dados={dados}
      orientacao="horizontal"
      formato="numero"
      ordenar="crescente"
      destacada="Alex"
    />,
  );

  const figura = screen.getByRole("figure", { name: "Volume por LinkedIn" });
  const tabela = within(figura).getByRole("table");
  expect(celulasDoCorpo(tabela)).toEqual([
    ["Alex", formatarNumero(165)],
    ["Jacob", formatarNumero(381)],
    ["Leticia", formatarNumero(395)],
  ]);

  cleanup();

  render(
    <GraficoBarrasContas
      titulo="Taxa por conta"
      dados={[
        { nome: "Jacob", valor: 0.0499 },
        { nome: "Alex", valor: null },
      ]}
      orientacao="vertical"
      formato="taxa"
      destacada={null}
    />,
  );

  const figuraTaxa = screen.getByRole("figure", { name: "Taxa por conta" });
  const celulasTaxa = celulasDoCorpo(within(figuraTaxa).getByRole("table"));
  expect(celulasTaxa).toEqual([
    ["Jacob", formatarTaxa(0.0499)],
    ["Alex", formatarTaxa(null)],
  ]);
  expect(celulasTaxa[0][1]).toBe("5,0%");
  expect(celulasTaxa[1][1]).toBe("—");
});
