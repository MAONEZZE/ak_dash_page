// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buscarFunilEvento } from "../src/lib/api";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import type { RespostaFunilEvento } from "../src/lib/tipos-api";
import { FunilEvento } from "../src/paginas/FunilEvento";

const RESPOSTA: RespostaFunilEvento = {
  periodo: { granularidade: "mes", inicio: "2026-11-01", fim: "2026-11-30" },
  avisos: [],
  evento: { id: "i2", titulo: "Imersão Alta Cadência", data: "2026-12-02T16:00:00+00:00", total: 6, aprovados: 3, pendentes: 2, rejeitados: 1 },
  funil: { inscritos: 5, onboarding_agendado: 4, onboarding_realizado: 3, comparecimento: 2, vendas: 1 },
};

vi.mock("../src/lib/api", () => ({ buscarFunilEvento: vi.fn(async () => RESPOSTA) }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

function renderizar(url = "/funil-evento?granularidade=mes&periodo=2026-11") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <AtualizacaoProvider>
        <FunilEvento />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

it("mostra o evento e os cards do evento com a conversão inscritos → vendas", async () => {
  renderizar();
  await screen.findByRole("heading", { name: /Imersão Alta Cadência/ });
  const bloco = screen.getByRole("region", { name: "Cards do evento" });
  expect([...bloco.querySelectorAll("article")].map((c) => c.textContent)).toEqual([
    "Total6",
    "Aprovados3",
    "Pendentes2",
    "Rejeitados1",
    "Conversãoinscritos → vendas20,0%",
  ]);
});

it("funil de cima pra baixo com as passagens entre etapas", async () => {
  renderizar();
  const funil = await screen.findByRole("list", { name: "Funil do Evento" });
  const etapas = within(funil).getAllByRole("listitem");
  expect(etapas.map((e) => e.querySelector("[data-segmento]")?.textContent)).toEqual([
    "Inscritos5",
    "Onboarding Agendado4",
    "Onboarding Realizado3",
    "Comparecimento2",
    "Vendas1",
  ]);
  expect(etapas[0].textContent).toContain("80,0% agendaram onboarding");
  expect(etapas[1].textContent).toContain("75,0% fizeram onboarding");
  expect(etapas[2].textContent).toContain("66,7% compareceram");
  expect(etapas[3].textContent).toContain("50,0% compraram");
  expect(screen.getByRole("group", { name: "Conversão total do funil" }).textContent).toContain("20,0%");
});

it("sem inscritos a conversão é 0,0% e não traço", async () => {
  vi.mocked(buscarFunilEvento).mockResolvedValueOnce({
    ...RESPOSTA,
    funil: { inscritos: 0, onboarding_agendado: 0, onboarding_realizado: 0, comparecimento: 0, vendas: 0 },
  });
  renderizar();
  await screen.findByRole("heading", { name: /Imersão Alta Cadência/ });
  const bloco = screen.getByRole("region", { name: "Cards do evento" });
  const cards = bloco.querySelectorAll("article");
  expect(cards[cards.length - 1].textContent).toBe("Conversãoinscritos → vendas0,0%");
});
