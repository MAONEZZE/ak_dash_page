// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buscarFunil } from "../src/lib/api";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import { FunilInstagram } from "../src/paginas/FunilInstagram";
import type { MetricasConta, RespostaFunil } from "../src/lib/tipos-api";

const ZERO: MetricasConta = {
  conexoes_enviadas: 0,
  conexoes_aceitas: 0,
  mensagens_abordagem: 0,
  abordagens: 0,
  follows_abordagem: 0,
  respondidos: 0,
  in_mails: 0,
  fups: 0,
  numeros_captados: 0,
  indicacoes: 0,
};

const RESPOSTA: RespostaFunil = {
  periodo: { granularidade: "mes", inicio: "2026-11-01", fim: "2026-11-30" },
  avisos: [],
  contas: [
    {
      id_conta: "1",
      nome: "Mary",
      metricas: { ...ZERO, abordagens: 100, respondidos: 30, numeros_captados: 6, fups: 50, indicacoes: 1 },
      serie: [{ data: "2026-11-02", metricas: { ...ZERO, abordagens: 100, respondidos: 30, numeros_captados: 6, fups: 50, indicacoes: 1 } }],
    },
    {
      id_conta: "2",
      nome: "akeel",
      metricas: { ...ZERO, abordagens: 100, respondidos: 20, numeros_captados: 4, fups: 150, indicacoes: 0 },
      serie: [{ data: "2026-11-03", metricas: { ...ZERO, abordagens: 100, respondidos: 20, numeros_captados: 4, fups: 150, indicacoes: 0 } }],
    },
    { id_conta: "3", nome: "Jacob", metricas: { ...ZERO }, serie: [] },
  ],
  meta_numeros_captados: 40,
};

vi.mock("../src/lib/api", () => ({
  buscarFunil: vi.fn(async () => RESPOSTA),
}));

beforeEach(() => vi.clearAllMocks());

afterEach(() => cleanup());

/** Card de KPI pelo rótulo (primeiro span do article). */
function cardDe(rotulo: string): HTMLElement {
  const card = screen.getAllByRole("article").find((a) => a.querySelector("span")?.textContent === rotulo);
  expect(card).toBeDefined();
  return card as HTMLElement;
}

/** Valor do card: o segundo span (o primeiro é o rótulo). */
function valorDe(rotulo: string): string | null {
  return cardDe(rotulo).querySelectorAll("span")[1].textContent;
}

it("mostra o funil e os cards somando todos os perfis", async () => {
  render(
    <MemoryRouter initialEntries={["/funil-instagram?granularidade=mes&periodo=2026-11"]}>
      <AtualizacaoProvider>
        <FunilInstagram />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );

  const lista = await screen.findByRole("list", { name: "Funil Instagram" });
  expect(buscarFunil).toHaveBeenCalledWith("instagram", { granularidade: "mes", periodo: "2026-11" });

  const medidor = screen.getByRole("meter", { name: "Números Captados" });
  expect(medidor.getAttribute("aria-valuenow")).toBe("10");
  expect(medidor.getAttribute("aria-valuemax")).toBe("40");
  expect(lista.closest(".glass-panel")?.nextElementSibling?.contains(medidor)).toBe(true);

  const etapas = within(lista).getAllByRole("listitem");
  expect(etapas).toHaveLength(3);
  expect(etapas[0].textContent).toContain("Abordagens feitas");
  expect(etapas[0].textContent).toContain("200");
  expect(etapas[0].textContent).toContain("↓ 25,0% responderam");
  expect(etapas[1].textContent).toContain("Respondidos");
  expect(etapas[1].textContent).toContain("50");
  expect(etapas[1].textContent).toContain("↓ 20,0% viraram número");
  expect(etapas[2].textContent).toContain("Números Captados");
  expect(etapas[2].textContent).toContain("10");

  const respondidosCard = within(lista)
    .getAllByRole("listitem")
    .find((etapa) => etapa.textContent?.includes("Respondidos"));
  expect(respondidosCard?.querySelector("[data-nota-lateral]")?.textContent).toContain("200 (1,0 por abordagem)");

  expect(etapas[0].textContent).not.toContain("não responderam");
  expect(etapas[1].textContent).not.toContain("não viraram número");
  expect(etapas[1].textContent).toContain("maior perda");
  expect(screen.getByRole("group", { name: "Conversão total do funil" }).textContent).toContain("5,0%");

  expect(valorDe("Follow-ups")).toBe("200");
  expect(valorDe("Indicações Captadas")).toBe("1");

  const rotulos = screen.getAllByRole("article").map((a) => a.querySelector("span")?.textContent);
  expect(rotulos).not.toContain("Conversão total do funil");
  expect(rotulos).not.toContain("Taxa de resposta");

  expect(screen.queryByText(/Consolidado de/)).toBeNull();
});

it("escolher um perfil filtra funil e cards", async () => {
  render(
    <MemoryRouter initialEntries={["/funil-instagram?granularidade=mes&periodo=2026-11"]}>
      <AtualizacaoProvider>
        <FunilInstagram />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );

  const lista = await screen.findByRole("list", { name: "Funil Instagram" });
  fireEvent.click(within(screen.getByRole("group", { name: "Perfil" })).getByRole("button", { name: "Mary" }));

  const etapas = within(lista).getAllByRole("listitem");
  expect(etapas[0].textContent).toContain("Abordagens feitas");
  expect(etapas[0].textContent).toContain("100");
  expect(etapas[0].textContent).toContain("↓ 30,0% responderam");
  expect(valorDe("Follow-ups")).toBe("50");
  expect(buscarFunil).toHaveBeenCalledTimes(1);
});

/** Cells de uma linha da tabela, pelo nome do perfil (ou TOTAL). */
function celulasDaLinha(tabela: HTMLElement, nome: string): string[] {
  const linha = within(tabela).getByRole("cell", { name: nome }).closest("tr") as HTMLElement;
  // Ignora o decorativo (foto/inicial com aria-hidden): fica o texto que o leitor de tela lê.
  return Array.from(linha.querySelectorAll("td"), (td) => {
    const copia = td.cloneNode(true) as HTMLElement;
    copia.querySelectorAll("[aria-hidden]").forEach((el) => el.remove());
    return copia.textContent ?? "";
  });
}

it("mostra a tabela de todos os perfis com o selecionado destacado e o gráfico por perfil", async () => {
  vi.useFakeTimers({ now: new Date(2026, 10, 13, 12), toFake: ["Date"] });

  try {
    render(
      <MemoryRouter initialEntries={["/funil-instagram?granularidade=mes&periodo=2026-11&conta=akeel"]}>
        <AtualizacaoProvider>
          <FunilInstagram />
        </AtualizacaoProvider>
      </MemoryRouter>,
    );

    const tabela = await screen.findByRole("table", { name: "Por perfil" });
    expect(within(tabela).getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Perfil",
      "Abordagens",
      "% Resposta",
      "Respondidos",
      "% Conversão em número",
      "Números Captados",
      "Conversão total",
    ]);

    expect(celulasDaLinha(tabela, "Mary")).toEqual(["Mary", "100", "30,0%", "30", "20,0%", "6", "6,0%"]);
    const fotoDe = (nome: string) => within(tabela).getByRole("cell", { name: nome }).querySelector("img")?.getAttribute("src");
    expect(fotoDe("Mary")).toContain("/fotos_dash/mariana.jpeg");
    expect(fotoDe("akeel")).toContain("/fotos_dash/akeel.jpeg");
    expect(celulasDaLinha(tabela, "akeel")).toEqual(["akeel", "100", "20,0%", "20", "20,0%", "4", "4,0%"]);
    expect(celulasDaLinha(tabela, "Jacob")).toEqual(["Jacob", "0", "—", "0", "—", "0", "—"]);
    expect(celulasDaLinha(tabela, "TOTAL")).toEqual(["TOTAL", "200", "25,0%", "50", "20,0%", "10", "5,0%"]);

    expect(within(tabela).getByRole("cell", { name: "akeel" }).closest("tr")?.getAttribute("aria-current")).toBe("true");
    expect(within(tabela).getByRole("cell", { name: "Mary" }).closest("tr")?.getAttribute("aria-current")).toBeNull();

    expect(screen.queryByRole("heading", { name: /Dashboard/ })).toBeNull();
    const grafico = screen.getByRole("figure", { name: "Evolução por conta" });
    expect(grafico.querySelectorAll("[data-linha]")).toHaveLength(3);
    expect([...grafico.querySelectorAll("[data-rotulo-x]")].at(-1)?.textContent).toBe("13/11");
    const seletor = screen.getByRole("combobox", { name: "Métrica" });
    expect(within(seletor).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Abordagens feitas",
      "Respondidos",
      "Números Captados",
      "Follow-ups",
      "Indicações Captadas",
    ]);
  } finally {
    vi.useRealTimers();
  }
});

it("clicar num mini-funil filtra o funil pelo perfil escolhido", async () => {
  render(
    <MemoryRouter initialEntries={["/funil-instagram?granularidade=mes&periodo=2026-11"]}>
      <AtualizacaoProvider>
        <FunilInstagram />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );

  const lista = await screen.findByRole("list", { name: "Funil Instagram" });
  const regiao = screen.getByRole("region", { name: "Funil por perfil" });
  expect(within(regiao).getAllByRole("button")).toHaveLength(3);
  const botaoMary = within(regiao).getByRole("button", { name: /Mary/ });
  expect(botaoMary.textContent).toContain("6,0%");

  fireEvent.click(botaoMary);
  expect(within(lista).getAllByRole("listitem")[0].textContent).toContain("100");
  expect(within(lista).getAllByRole("listitem")[0].textContent).toContain("↓ 30,0% responderam");
  expect(within(regiao).getByRole("button", { name: /Mary/ }).getAttribute("aria-pressed")).toBe("true");

  fireEvent.click(within(regiao).getByRole("button", { name: /Mary/ }));
  expect(within(lista).getAllByRole("listitem")[0].textContent).toContain("200");
  expect(buscarFunil).toHaveBeenCalledTimes(1);
});

it("sem título da página", async () => {
  render(
    <MemoryRouter initialEntries={["/funil-instagram?granularidade=mes&periodo=2026-11"]}>
      <AtualizacaoProvider>
        <FunilInstagram />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );

  await screen.findByRole("list", { name: "Funil Instagram" });
  expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
});

it("sem abordagens registradas, follow-ups mostram só o total", async () => {
  vi.mocked(buscarFunil).mockResolvedValueOnce({
    ...RESPOSTA,
    contas: [{ id_conta: "1", nome: "Jacob", metricas: { ...ZERO, fups: 225, numeros_captados: 21 }, serie: [] }],
  });

  render(
    <MemoryRouter initialEntries={["/funil-instagram?granularidade=mes&periodo=2026-11"]}>
      <AtualizacaoProvider>
        <FunilInstagram />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );

  await screen.findByRole("list", { name: "Funil Instagram" });
  const nota = document.querySelector("[data-nota-lateral]")?.textContent;
  expect(nota).toContain("225");
  expect(nota).not.toContain("por abordagem");
});

it("follow-ups aparecem em card ligado à etapa Respondidos", async () => {
  render(
    <MemoryRouter initialEntries={["/funil-instagram?granularidade=mes&periodo=2026-11"]}>
      <AtualizacaoProvider>
        <FunilInstagram />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );

  const lista = await screen.findByRole("list", { name: "Funil Instagram" });
  const respondidos = within(lista)
    .getAllByRole("listitem")
    .find((etapa) => etapa.textContent?.includes("Respondidos"));
  expect(respondidos?.querySelector("[data-nota-lateral]")?.textContent).toContain("Follow-ups");
  expect(document.querySelector("[data-nota-rodape]")).toBeNull();
});
