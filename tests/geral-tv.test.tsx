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
import { formatarDiaMesEvento, formatarNumero } from "../src/lib/formato";
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
  it("página sem rolagem: a grade fica com a tela, KPIs na altura natural e o Termômetro com o resto", async () => {
    const { container } = montar();
    const grade = await screen.findByRole("region", { name: "Visão geral" });

    expect((container.firstElementChild as HTMLElement).className).toContain("xl:overflow-hidden");
    expect(grade.className).toContain("xl:flex-1");
    expect(grade.className).toContain("xl:grid-cols-4");
    expect(grade.className).toContain("xl:grid-rows-[auto_auto_auto_minmax(0,1fr)]");
  });

  it("empilha os KPIs claros, estende Eventos e Logs e não renderiza rankings", async () => {
    montar();
    const grade = await screen.findByRole("region", { name: "Visão geral" });
    // Eventos e Logs vêm dentro da coluna lateral, que é o último filho da grade.
    const lateral = grade.lastElementChild as HTMLElement;
    const celulas = [...[...grade.children].slice(0, -1), ...lateral.children];
    expect(celulas.map(rotulo)).toEqual([
      "Faturamento",
      "Liquidado",
      "Termômetro de liquidado",
      "Reuniões Agendadas",
      "Inscrições Realizadas",
      "Oportunidade",
      "Eventos do mês",
      "Logs",
    ]);
    const classe = (label: string) => celulas.find((c) => rotulo(c) === label)?.className ?? "";
    expect(classe("Faturamento")).toContain("xl:col-start-1 xl:row-start-1");
    expect(classe("Liquidado")).toContain("xl:col-start-1 xl:row-start-2");
    expect(classe("Termômetro de liquidado")).toContain("xl:col-start-1 xl:row-start-3 xl:row-span-2");
    expect(classe("Reuniões Agendadas")).toContain("xl:col-start-2 xl:row-start-1");
    expect(classe("Inscrições Realizadas")).toContain("xl:col-start-2 xl:row-start-2");
    expect(classe("Oportunidade")).toContain("xl:col-start-2 xl:row-start-3");
    expect(lateral.className).toContain("xl:col-start-3 xl:col-span-2 xl:row-start-1 xl:row-span-4");
    expect(lateral.className).toContain("xl:flex-col");
    expect(lateral.classList.contains("contents")).toBe(true);
    // Metade da lateral pra cada um.
    expect(classe("Eventos do mês")).toContain("xl:flex-1 xl:basis-0");
    expect(classe("Logs")).toContain("xl:flex-1 xl:basis-0");
    expect(screen.queryByRole("article", { name: "Ranking Seller" })).toBeNull();
    expect(screen.queryByRole("article", { name: "Ranking SDR" })).toBeNull();
    expect(screen.queryByRole("article", { name: "Ranking Closer" })).toBeNull();
  });

  it("Eventos do mês mostra título, data, inscritos, aprovados, pendentes e rejeitados", async () => {
    montar();
    const tabela = await screen.findByRole("table", { name: "Eventos do mês" });
    // fixture tem 10 eventos: todos renderizados (+1 linha de cabeçalho); o que não cabe no card rola
    expect(within(tabela).getAllByRole("row")).toHaveLength(11);
    expect(within(tabela).getByRole("rowgroup").className).toContain("overflow-y-auto");
    expect(screen.queryByRole("table", { name: "Eventos do mês (cont.)" })).toBeNull();
    expect(within(tabela).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Evento", "Data", "In.", "Ap.", "P.", "R."]);
    const [, primeira] = within(tabela).getAllByRole("row");
    const e = geral.eventos[0];
    expect(within(primeira).getAllByRole("cell")).toHaveLength(6);
    expect(within(primeira).getAllByRole("cell").map((c) => c.textContent)).toEqual([
      e.titulo,
      formatarDiaMesEvento(e.data),
      formatarNumero(e.inscritos),
      formatarNumero(e.aprovados),
      formatarNumero(e.pendentes),
      formatarNumero(e.rejeitados),
    ]);
  });

  it("Logs: uma linha por log com o primeiro nome do usuário, atividade e cliente", async () => {
    montar();
    const tabela = await screen.findByRole("table", { name: "Logs" });
    expect(within(tabela).getAllByRole("columnheader").map((c) => c.textContent)).toEqual(["Usuário", "Atividade", "Cliente"]);
    const [, primeira, , semUsuario] = within(tabela).getAllByRole("row");
    expect(within(primeira).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Jennifer", "Números Captados", "Isaque Costa"]);
    expect(within(semUsuario).getAllByRole("cell").map((c) => c.textContent)).toEqual(["—", "Indicações", "—"]);
  });

  it("ligações realizadas não é mais card da Geral", async () => {
    montar();
    await screen.findByRole("region", { name: "Visão geral" });
    expect(screen.queryByText("Ligações Realizadas")).toBeNull();
  });

  it("termômetro mostra o liquidado do mês contra a meta", async () => {
    montar();
    const termometro = await screen.findByRole("article", { name: "Termômetro de liquidado" });
    // fixture: R$ 152.000 de R$ 380.000 = 40% → médio
    expect(within(termometro).getByRole("meter").getAttribute("aria-valuenow")).toBe("152000");
    expect(within(termometro).getByRole("meter").getAttribute("aria-valuemax")).toBe("380000");
    expect(termometro.textContent).toContain("40% da meta");
    expect(termometro.getAttribute("data-temperatura")).toBe("medio");
  });
});
