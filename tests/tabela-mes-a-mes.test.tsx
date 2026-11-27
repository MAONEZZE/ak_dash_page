// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TabelaMesAMes } from "../src/componentes/TabelaMesAMes";
import { serieMensal, totalSerie } from "../src/lib/agregacoes-notas";

describe("TabelaMesAMes", () => {
  afterEach(() => cleanup());

  it("mostra só receita líquida, ticket médio e nº de vendas por mês e no total", () => {
    const pontos = serieMensal(
      [{ chave: "a", mes: "2026-09", data_referencia: "2026-09-12", cliente: null, categoria: "venda nova", produto: null, valor_pago: 10000, valor_venda: 60000, forma_pagamento: "PIX", canal: null }],
      "2026",
    );
    const { container } = render(<TabelaMesAMes pontos={pontos} total={totalSerie(pontos)} ano="2026" />);

    const cabecalhos = Array.from(container.querySelectorAll("thead th")).map((th) => th.textContent?.trim());
    const idxSet = cabecalhos.indexOf("Set/26");
    const idxJan = cabecalhos.indexOf("Jan/26");
    expect(idxSet).toBeGreaterThan(0);
    expect(idxJan).toBeGreaterThan(0);
    expect(cabecalhos).toContain("Total 2026");

    const linhas = Array.from(container.querySelectorAll("tbody tr")) as HTMLTableRowElement[];
    expect(linhas.map((tr) => tr.querySelector("td")?.textContent)).toEqual(["Receita líquida", "Ticket médio", "Nº de vendas"]);

    const celula = (linha: number, coluna: number) => linhas[linha].querySelectorAll("td")[coluna].textContent ?? "";
    expect(celula(0, idxSet)).toMatch(/R\$\s*10\.000,00/);
    expect(celula(1, idxSet)).toMatch(/R\$\s*60\.000,00/);
    expect(celula(2, idxSet)).toBe("1");
    expect(celula(0, idxJan)).toMatch(/R\$\s*0,00/);
    expect(celula(1, idxJan)).toBe("—");
    expect(celula(2, idxJan)).toBe("0");
    expect(screen.getByRole("table", { name: "Resultado mês a mês" })).toBeTruthy();
  });
});
