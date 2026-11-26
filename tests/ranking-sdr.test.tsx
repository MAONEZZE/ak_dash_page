// @vitest-environment jsdom
//
// Ranking SDR vertical da página SDR: mostra posição, pontos e a composição
// ligações + inscrições de cada SDR, na ordem que vem do BFF.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RankingSdr } from "../src/componentes/RankingSdr";
import type { SdrPaginaSdr } from "../src/lib/tipos-api";

afterEach(() => cleanup());

function sdr(nome: string, posicao: number, pontuacao: number, ligacoes: number, inscricoes: number): SdrPaginaSdr {
  return {
    id_user: nome.toLowerCase(),
    nome,
    imagem_url: null,
    inscricoes,
    meta_inscricoes: null,
    ligacoes,
    pontuacao,
    posicao,
    meta_diaria: null,
    previsao: null,
    serie_evento: [],
  };
}

describe("RankingSdr", () => {
  it("lista todos os SDRs na ordem do ranking com posição, pontos e a composição ligações + inscrições", () => {
    const sdrs = [
      sdr("Ana", 1, 80, 10, 0),
      sdr("Juca", 2, 60, 0, 6),
      sdr("Jennifer", 2, 60, 5, 2),
    ];

    render(<RankingSdr sdrs={sdrs} />);

    const lista = screen.getByRole("list", { name: "Ranking SDR" });
    const itens = within(lista).getAllByRole("listitem");
    expect(itens).toHaveLength(3);

    const posicoes = Array.from(lista.querySelectorAll("[data-posicao]")).map((el) => el.textContent);
    expect(posicoes).toEqual(["1º", "2º", "2º"]);

    const pontos = Array.from(lista.querySelectorAll("[data-pontos]")).map((el) => el.textContent);
    expect(pontos).toEqual(["80 pts", "60 pts", "60 pts"]);

    expect(itens[1].textContent).toContain("0 ligações · 6 inscrições");

    expect(itens[0].getAttribute("data-lider")).toBe("true");
    expect(itens[1].hasAttribute("data-lider")).toBe(false);
    expect(itens[2].hasAttribute("data-lider")).toBe(false);

    expect(itens[0].classList.contains("bg-warn-bg")).toBe(true);
    for (const item of itens) {
      expect(item.getAttribute("class") ?? "").not.toMatch(/\bbg-[a-z][\w-]*\/\d+\b/);
      const fundo = item.querySelector("[data-avatar-fundo]");
      expect(fundo).not.toBeNull();
      expect(fundo?.classList.contains("bg-surface")).toBe(true);
      expect(fundo?.classList.contains("rounded-full")).toBe(true);
    }
  });

  it("mostra aviso quando não há SDR ativo", () => {
    render(<RankingSdr sdrs={[]} />);

    expect(screen.getByText("Nenhum SDR ativo.")).toBeTruthy();
  });
});
