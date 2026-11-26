// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buscarPaginaSdr } from "../src/lib/api";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import type { RespostaPaginaSdr, SdrPaginaSdr } from "../src/lib/tipos-api";
import { Sdr } from "../src/paginas/Sdr";

function sdr(parcial: Pick<SdrPaginaSdr, "id_user" | "nome" | "posicao" | "inscricoes">): SdrPaginaSdr {
  return {
    imagem_url: null,
    meta_inscricoes: null,
    ligacoes: 0,
    pontuacao: 0,
    meta_diaria: null,
    previsao: null,
    serie_evento: [],
    ...parcial,
  };
}

const RESPOSTA: RespostaPaginaSdr = {
  periodo: { granularidade: "mes", inicio: "2026-11-01", fim: "2026-11-30" },
  avisos: [],
  evento: { id: "e1", titulo: "Imersão Alta Cadência", data: "2026-12-02T16:00:00+00:00", capacidade: 80 },
  janela: { inicio: "2026-11-01", fim: "2026-12-01" },
  sdrs: [
    sdr({ id_user: "7", nome: "Ana Lima", posicao: 1, inscricoes: 30 }),
    sdr({ id_user: "11", nome: "Juca Silva", posicao: 2, inscricoes: 10 }),
    sdr({ id_user: "14", nome: "Jennifer Souza", posicao: 3, inscricoes: 9 }),
  ],
};

vi.mock("../src/lib/api", () => ({ buscarPaginaSdr: vi.fn(async () => RESPOSTA) }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

function renderizar(url = "/sdr?granularidade=mes&periodo=2026-11") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <AtualizacaoProvider>
        <Sdr />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

it("mostra inscrições só de Juca e Jennifer, ranking de todos e o gráfico do evento no grid da viewport", async () => {
  renderizar();
  const card = await screen.findByRole("region", { name: "Inscrições Realizadas" });
  expect([...card.querySelectorAll("[data-sdr]")].map((e) => e.getAttribute("data-sdr"))).toEqual(["Juca Silva", "Jennifer Souza"]);

  const ranking = screen.getByRole("list", { name: "Ranking SDR" });
  expect(within(ranking).getAllByRole("listitem")).toHaveLength(3);

  expect(screen.getByText("Ritmo de inscrições — Imersão Alta Cadência")).toBeTruthy();
  expect(buscarPaginaSdr).toHaveBeenCalledWith({ granularidade: "mes", periodo: "2026-11", evento: null });

  const pagina = document.querySelector('[data-pagina="sdr"]') as HTMLElement;
  expect(pagina).not.toBeNull();
  for (const classe of ["md:h-full", "md:overflow-hidden", "md:grid-rows-2", "md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"]) expect(pagina.classList.contains(classe)).toBe(true);

  const wrapperRanking = ranking.closest("article")!.parentElement!;
  expect(wrapperRanking.classList.contains("md:row-span-2")).toBe(true);
});

it("sem evento e sem janela, o gráfico mostra 'Nenhum evento'", async () => {
  vi.mocked(buscarPaginaSdr).mockResolvedValueOnce({ ...RESPOSTA, evento: null, janela: null });
  renderizar();
  await screen.findByRole("region", { name: "Inscrições Realizadas" });
  expect(screen.getByText("Nenhum evento")).toBeTruthy();
});
