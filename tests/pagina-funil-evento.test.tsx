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
  funil: { inscritos: 2, onboarding_agendado: 1, onboarding_realizado: 1, comparecimento: 1, vendas: 1 },
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
    "Total (SED)6",
    "Aprovados3",
    "Pendentes2",
    "Rejeitados1",
    "Conversãoinscritos → vendas16,7%",
  ]);
});

it("funil começa em Inscritos e as passagens usam o acumulado das etapas", async () => {
  vi.mocked(buscarFunilEvento).mockResolvedValueOnce({
    ...RESPOSTA,
    funil: { inscritos: 20, onboarding_agendado: 3, onboarding_realizado: 2, comparecimento: 0, vendas: 0 },
  });
  renderizar();
  const funil = await screen.findByRole("list", { name: "Funil do Evento" });
  const etapas = within(funil).getAllByRole("listitem");
  expect(etapas.map((e) => e.querySelector("[data-segmento]")?.textContent)).toEqual([
    "Inscritos20",
    "Onboarding Agendado3",
    "Onboarding Realizado2",
    "Comparecimento0",
    "Vendas0",
  ]);
  // 25 no total; chegaram a Onboarding Agendado ou além 5, a Realizado ou além 2.
  expect(etapas[0].textContent).toContain("↓ 20,0% agendaram onboarding");
  expect(etapas[1].textContent).toContain("40,0% fizeram onboarding");
  expect(etapas[2].textContent).toContain("0,0% compareceram");
});

it("conversão do evento é vendas ÷ soma de todas as etapas", async () => {
  vi.mocked(buscarFunilEvento).mockResolvedValueOnce({
    ...RESPOSTA,
    funil: { inscritos: 36, onboarding_agendado: 0, onboarding_realizado: 0, comparecimento: 0, vendas: 4 },
  });
  renderizar();
  await screen.findByRole("heading", { name: /Imersão Alta Cadência/ });
  const bloco = screen.getByRole("region", { name: "Cards do evento" });
  const cards = bloco.querySelectorAll("article");
  expect(cards[cards.length - 1].textContent).toBe("Conversãoinscritos → vendas10,0%");
  const conversaoTotal = screen.getByRole("group", { name: "Conversão total do funil" });
  expect(conversaoTotal.textContent).toBe("Conversão total do funil10,0%");
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

it("sem imersão mostra o aviso e nenhum card do evento", async () => {
  vi.mocked(buscarFunilEvento).mockResolvedValueOnce({
    ...RESPOSTA,
    evento: null,
    funil: { inscritos: 0, onboarding_agendado: 0, onboarding_realizado: 0, comparecimento: 0, vendas: 0 },
  });
  renderizar();
  await screen.findByText("Nenhuma imersão encontrada");
  expect(screen.queryByRole("region", { name: "Cards do evento" })).toBeNull();
  expect(screen.getByRole("list", { name: "Funil do Evento" })).toBeTruthy();
});
