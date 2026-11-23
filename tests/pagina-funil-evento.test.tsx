// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
