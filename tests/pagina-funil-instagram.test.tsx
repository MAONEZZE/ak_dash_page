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

  expect(valorDe("Conversão total do funil")).toBe("5,0%");
  expect(valorDe("Follow-ups")).toBe("200");
  expect(valorDe("Indicações Captadas")).toBe("1");
  expect(valorDe("Taxa de resposta")).toBe("25,0%");

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
