// @vitest-environment jsdom
//
// Geral na TV (1920×1080): tudo cabe sem rolagem, numa grade de 4 colunas ×
// 4 linhas. jsdom não faz layout: o teste trava as regras de classe e o
// conteúdo de cada coluna.
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import geral from "../src/lib/fixtures/geral.example.json";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import { SomProvider } from "../src/lib/som";
import { Geral } from "../src/paginas/Geral";

vi.mock("../src/lib/api", () => ({ buscarGeral: async () => geral }));

afterEach(() => cleanup());

function montar() {
  return render(
    <MemoryRouter>
      <AtualizacaoProvider>
        <SomProvider>
          <Geral />
        </SomProvider>
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

/** Rótulo do card (1º span) ou aria-label do article, pra ler a ordem dos itens. */
function rotulo(celula: Element): string | null | undefined {
  const article = celula.querySelector("article");
  return article?.getAttribute("aria-label") ?? article?.querySelector("span")?.textContent;
}

describe("Geral — layout da TV", () => {
  it("página sem rolagem: a grade fica com a tela e as duas últimas linhas dividem o resto", async () => {
    const { container } = montar();
    const grade = await screen.findByRole("region", { name: "Visão geral" });

    expect((container.firstElementChild as HTMLElement).className).toContain("xl:overflow-hidden");
    expect(grade.className).toContain("xl:flex-1");
    expect(grade.className).toContain("xl:grid-cols-4");
    expect(grade.className).toContain("xl:grid-rows-[auto_auto_minmax(0,1fr)_minmax(0,1fr)]");
  });

  it("cada item na coluna/linha combinada, e no DOM na ordem coluna 1→4 (ordem do celular)", async () => {
    montar();
    const grade = await screen.findByRole("region", { name: "Visão geral" });
    const itens = [...grade.children].map((c) => [rotulo(c), c.className.match(/xl:col-start-\d xl:row-start-\d/)?.[0]]);
    expect(itens).toEqual([
      ["Faturamento", "xl:col-start-1 xl:row-start-1"],
      ["Liquidado", "xl:col-start-1 xl:row-start-2"],
      ["Termômetro de faturamento", "xl:col-start-1 xl:row-start-3"],
      ["Reuniões Agendadas", "xl:col-start-2 xl:row-start-1"],
      ["Ligações Realizadas", "xl:col-start-2 xl:row-start-2"],
      ["Ranking SDR", "xl:col-start-2 xl:row-start-3"],
      ["Ranking Closer", "xl:col-start-2 xl:row-start-4"],
      ["Inscrições Realizadas", "xl:col-start-3 xl:row-start-1"],
      ["Confrarias do mês", "xl:col-start-3 xl:row-start-2"],
      ["Oportunidade", "xl:col-start-4 xl:row-start-1"],
      ["Contas Dripify", "xl:col-start-4 xl:row-start-2"],
    ]);
  });

  it("Confrarias numa tabela só, de até 10 linhas", async () => {
    montar();
    const tabela = await screen.findByRole("table", { name: "Confrarias do mês" });
    // fixture tem 10 Confrarias (+1 linha de cabeçalho)
    expect(within(tabela).getAllByRole("row")).toHaveLength(11);
    expect(screen.queryByRole("table", { name: "Confrarias do mês (cont.)" })).toBeNull();
  });

  it("Contas Dripify: uma linha por conta com conexões aceitas e números captados", async () => {
    montar();
    const tabela = await screen.findByRole("table", { name: "Contas Dripify" });
    expect(within(tabela).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Conta", "Conexões Aceitas", "Números Captados"]);
    const [, jacob] = within(tabela).getAllByRole("row");
    expect(within(jacob).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Jacob", "40", "30"]);
  });

  it("um ranking por cargo, sem botão de troca", async () => {
    montar();
    const sdr = await screen.findByRole("article", { name: "Ranking SDR" });
    const closer = screen.getByRole("article", { name: "Ranking Closer" });
    expect(within(sdr).queryByRole("button")).toBeNull();
    expect(within(sdr).getByText("1º").parentElement?.textContent).not.toBe(within(closer).getByText("1º").parentElement?.textContent);
  });

  it("termômetro mostra o faturamento do mês contra a meta", async () => {
    montar();
    const termometro = await screen.findByRole("article", { name: "Termômetro de faturamento" });
    // fixture: R$ 152.000 de R$ 380.000 = 40% → médio
    expect(within(termometro).getByRole("meter").getAttribute("aria-valuenow")).toBe("152000");
    expect(within(termometro).getByRole("meter").getAttribute("aria-valuemax")).toBe("380000");
    expect(termometro.textContent).toContain("40% da meta");
    expect(termometro.getAttribute("data-temperatura")).toBe("medio");
  });
});
