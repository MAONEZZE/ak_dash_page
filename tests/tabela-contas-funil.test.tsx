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

it("células de taxa ganham barrinha proporcional sem mudar o texto", () => {
  const colunas: ColunaFunil[] = [
    { chave: "enviadas", rotulo: "Conexões Enviadas", tipo: "numero" },
    { chave: "aceitacao", rotulo: "% Aceitação", tipo: "taxa" },
  ];
  const linhas: LinhaFunil[] = [
    { nome: "Jacob", valores: { enviadas: 381, aceitacao: 0.664 } },
    { nome: "Alex", valores: { enviadas: 0, aceitacao: null } },
    { nome: "Mary", valores: { enviadas: 10, aceitacao: 1.3 } },
  ];
  const total: LinhaFunil = { nome: "TOTAL", valores: { enviadas: 391, aceitacao: 0.7 } };

  render(<TabelaContasFunil titulo="Por LinkedIn" rotuloConta="LinkedIn" colunas={colunas} linhas={linhas} total={total} />);

  const tabela = screen.getByRole("table", { name: "Por LinkedIn" });

  const jacob = within(tabela).getByRole("row", { name: /Jacob/ });
  const tdsJacob = Array.from(jacob.querySelectorAll("td"));
  expect(tdsJacob.map((td) => td.textContent)).toEqual(["Jacob", "381", "66,4%"]);
  const barraJacob = tdsJacob[2].querySelector("[data-barra-taxa]") as HTMLElement | null;
  expect(barraJacob).not.toBeNull();
  expect((barraJacob!.firstElementChild as HTMLElement).style.width).toBe("66.4%");
  expect(tdsJacob[1].querySelector("[data-barra-taxa]")).toBeNull();

  const alex = within(tabela).getByRole("row", { name: /Alex/ });
  expect(alex.querySelector("[data-barra-taxa]")).toBeNull();

  const mary = within(tabela).getByRole("row", { name: /Mary/ });
  const barraMary = mary.querySelector("[data-barra-taxa]") as HTMLElement;
  expect((barraMary.firstElementChild as HTMLElement).style.width).toBe("100%");

  const totalRow = within(tabela).getByRole("row", { name: /TOTAL/ });
  const barraTotal = totalRow.querySelector("[data-barra-taxa]") as HTMLElement;
  expect(barraTotal).not.toBeNull();
  expect((barraTotal.firstElementChild as HTMLElement).style.width).toBe("70%");
});
