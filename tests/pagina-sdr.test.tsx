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
    ranking_mes: { negocios: 0, inscricoes: 0, inscricoes_hoje: 0, meta: 40 },
    ...parcial,
  };
}

const RESPOSTA: RespostaPaginaSdr = {
  periodo: { granularidade: "mes", inicio: "2026-11-01", fim: "2026-11-30" },
  avisos: [],
  evento: { id: "e1", titulo: "Imersão Alta Cadência", data: "2026-12-02T16:00:00+00:00", capacidade: 80 },
  janela: { inicio: "2026-11-01", fim: "2026-12-01" },
  mes_ranking: { inicio: "2026-11-01", fim: "2026-11-30" },
  janela_meta: { inicio: "2026-11-01", fim: "2026-11-30" },
  inscritos_sed_mes: 57,
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

it("mostra só o card de ranking, com todos os SDRs e o total de inscritos do SED", async () => {
  renderizar();
  const ranking = await screen.findByRole("list", { name: "Ranking SDR" });
  expect(within(ranking).getAllByRole("listitem")).toHaveLength(3);
  expect(document.querySelector("[data-total-geral]")?.textContent).toBe("57 inscritos");
  expect(buscarPaginaSdr).toHaveBeenCalledWith({ granularidade: "mes", periodo: mesCorrente(), evento: null });

  expect(screen.queryByRole("region", { name: "Inscrições Realizadas" })).toBeNull();
  expect(screen.queryByText(/Ritmo de inscrições/)).toBeNull();
  const pagina = document.querySelector('[data-pagina="sdr"]') as HTMLElement;
  expect(pagina.querySelectorAll("article")).toHaveLength(1);
});

it("ignora o período da URL: sempre pede o mês corrente", async () => {
  renderizar("/sdr?granularidade=dia&periodo=2026-09-10");
  await screen.findByRole("list", { name: "Ranking SDR" });
  expect(buscarPaginaSdr).toHaveBeenCalledWith({ granularidade: "mes", periodo: mesCorrente(), evento: null });
});

function mesCorrente(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}
