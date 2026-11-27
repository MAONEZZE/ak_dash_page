// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buscarPaginaSeller } from "../src/lib/api";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import type { RespostaPaginaSeller } from "../src/lib/tipos-api";
import { Seller } from "../src/paginas/Seller";

const RESPOSTA: RespostaPaginaSeller = {
  periodo: { granularidade: "mes", inicio: "2026-11-01", fim: "2026-11-30" },
  avisos: [],
  sellers: [
    { id_user: "13", nome: "Lucas", imagem_url: null, numeros_captados: 7, numeros_captados_hoje: 1, meta: null },
    { id_user: "4", nome: "Duda", imagem_url: null, numeros_captados: 8, numeros_captados_hoje: 2, meta: 88 },
  ],
};

vi.mock("../src/lib/api", () => ({ buscarPaginaSeller: vi.fn(async () => RESPOSTA) }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

function renderizar(url = "/seller?granularidade=dia&periodo=2026-09-10") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <AtualizacaoProvider>
        <Seller />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

it("mostra o ranking de números captados dos sellers do mês corrente, sem negócios e sem badge", async () => {
  renderizar();
  const ranking = await screen.findByRole("list", { name: "Ranking Seller" });
  const itens = within(ranking).getAllByRole("listitem");
  expect(itens.map((li) => li.getAttribute("data-item"))).toEqual(["4", "13"]);
  expect(screen.getByRole("heading", { name: "Ranking Seller — Números captados" })).toBeTruthy();
  expect(document.querySelector("[data-negocios]")).toBeNull();
  expect(document.querySelector("[data-total-geral]")).toBeNull();
  expect(screen.getByRole("progressbar", { name: "Números de Duda" })).toBeTruthy();
  expect(ranking.closest("article")?.textContent).toContain("Meta até 30/11:");
  expect(buscarPaginaSeller).toHaveBeenCalledWith({ granularidade: "mes", periodo: mesCorrente() });

  const pagina = document.querySelector('[data-pagina="seller"]') as HTMLElement;
  expect(pagina.classList.contains("md:h-full")).toBe(true);
  expect(pagina.classList.contains("md:min-h-0")).toBe(true);
  expect(pagina.classList.contains("md:overflow-hidden")).toBe(true);
});

it("sem sellers, mostra a mensagem de vazio", async () => {
  vi.mocked(buscarPaginaSeller).mockResolvedValueOnce({ ...RESPOSTA, sellers: [] });
  renderizar();
  expect(await screen.findByText("Nenhum seller ativo.")).toBeTruthy();
});

function mesCorrente(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}
