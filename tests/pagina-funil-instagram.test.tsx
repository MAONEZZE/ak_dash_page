// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buscarFunil } from "../src/lib/api";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import { FunilInstagram } from "../src/paginas/FunilInstagram";
import type { MetricaTime, MetricasConta, RespostaFunil } from "../src/lib/tipos-api";

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
    },
    {
      id_conta: "2",
      nome: "akeel",
      metricas: { ...ZERO, abordagens: 100, respondidos: 20, numeros_captados: 4, fups: 150, indicacoes: 0 },
    },
    { id_conta: "3", nome: "Jacob", metricas: { ...ZERO } },
  ],
  dashboard: {
    seller: { id_user: "1", nome: "Lucas" },
    diario: [],
    semanal: [],
    mensal: [],
  },
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

  expect(within(lista).getByText("Follow-ups")).toBeTruthy();
  expect(within(lista).getByText("200 (1,0 por abordagem)")).toBeTruthy();

  expect(etapas[0].textContent).toContain("−150 não responderam");
  expect(etapas[1].textContent).toContain("−40 não viraram número");
  expect(etapas[1].textContent).toContain("maior perda");
  expect(screen.getByRole("group", { name: "Conversão total do funil" }).textContent).toContain("5,0%");

  expect(valorDe("Follow-ups")).toBe("200");
  expect(valorDe("Indicações Captadas")).toBe("1");

  const rotulos = screen.getAllByRole("article").map((a) => a.querySelector("span")?.textContent);
  expect(rotulos).not.toContain("Conversão total do funil");
  expect(rotulos).not.toContain("Taxa de resposta");

  expect(screen.getByText("Consolidado de Mary, akeel e Jacob")).toBeTruthy();
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
  return Array.from(linha.querySelectorAll("td"), (td) => td.textContent ?? "");
}

it("mostra a tabela de todos os perfis com o selecionado destacado e o bloco Dashboard", async () => {
  const mensal: MetricaTime = {
    metrica: "numeros_captados",
    nome_exibicao: "Números Captados",
    meta_periodo: 441,
    realizado: 33,
    pct_atingimento: 7.5,
    falta_folga: { tipo: "falta", valor: 408 },
    horas_restantes: null,
    media_necessaria: { valor: 37.1, unidade: "dia", situacao: "pendente" },
    previsao: null,
  };
  vi.mocked(buscarFunil).mockResolvedValueOnce({ ...RESPOSTA, dashboard: { ...RESPOSTA.dashboard, mensal: [mensal] } });
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
      "Follow-ups",
    ]);

    expect(celulasDaLinha(tabela, "Mary")).toEqual(["Mary", "100", "30,0%", "30", "20,0%", "6", "6,0%", "50"]);
    expect(celulasDaLinha(tabela, "akeel")).toEqual(["akeel", "100", "20,0%", "20", "20,0%", "4", "4,0%", "150"]);
    expect(celulasDaLinha(tabela, "Jacob")).toEqual(["Jacob", "0", "—", "0", "—", "0", "—", "0"]);
    expect(celulasDaLinha(tabela, "TOTAL")).toEqual(["TOTAL", "200", "25,0%", "50", "20,0%", "10", "5,0%", "200"]);

    expect(within(tabela).getByRole("cell", { name: "akeel" }).closest("tr")?.getAttribute("aria-current")).toBe("true");
    expect(within(tabela).getByRole("cell", { name: "Mary" }).closest("tr")?.getAttribute("aria-current")).toBeNull();

    const listaMensal = screen.getByRole("list", { name: "Mensal" });
    expect(within(listaMensal).getByText("/ 441")).toBeTruthy();
    expect(listaMensal.textContent).toContain("37,1 por dia · dias úteis restantes: 11");

    expect(screen.getByRole("heading", { name: "Dashboard · Lucas" })).toBeTruthy();
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
