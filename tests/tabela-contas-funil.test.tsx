// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { TabelaContasFunil } from "../src/componentes/TabelaContasFunil";
import type { ColunaFunil, LinhaFunil } from "../src/lib/funil";

afterEach(() => cleanup());

it("mostra uma linha por conta, a linha TOTAL e destaca a conta selecionada", () => {
  const colunas: ColunaFunil[] = [
    { chave: "enviadas", rotulo: "Conexões Enviadas", tipo: "numero" },
    { chave: "aceitacao", rotulo: "% Aceitação", tipo: "taxa" },
  ];
  const linhas: LinhaFunil[] = [
    { nome: "Jacob", valores: { enviadas: 381, aceitacao: 0.664 } },
    { nome: "Alex", valores: { enviadas: 0, aceitacao: null } },
  ];
  const total: LinhaFunil = { nome: "TOTAL", valores: { enviadas: 381, aceitacao: 0.664 } };

  const { rerender } = render(
    <TabelaContasFunil titulo="Por LinkedIn" rotuloConta="LinkedIn" colunas={colunas} linhas={linhas} total={total} destacada="Alex" />,
  );

  const tabela = screen.getByRole("table", { name: "Por LinkedIn" });
  const cabecalhos = within(tabela).getAllByRole("columnheader").map((th) => th.textContent);
  expect(cabecalhos).toEqual(["LinkedIn", "Conexões Enviadas", "% Aceitação"]);

  const jacob = within(tabela).getByRole("row", { name: /Jacob/ });
  expect(jacob.textContent).toContain("381");
  expect(jacob.textContent).toContain("66,4%");

  const alex = within(tabela).getByRole("row", { name: /Alex/ });
  expect(alex.textContent).toContain("0");
  expect(alex.textContent).toContain("—");
  expect(alex.getAttribute("aria-current")).toBe("true");

  const linhasDaTabela = within(tabela).getAllByRole("row");
  expect(linhasDaTabela[linhasDaTabela.length - 1].textContent?.startsWith("TOTAL")).toBe(true);

  rerender(
    <TabelaContasFunil titulo="Por LinkedIn" rotuloConta="LinkedIn" colunas={colunas} linhas={linhas} total={total} />,
  );
  const tabelaSem = screen.getByRole("table", { name: "Por LinkedIn" });
  for (const linha of within(tabelaSem).getAllByRole("row")) {
    expect(linha.hasAttribute("aria-current")).toBe(false);
  }
});
