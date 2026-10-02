// @vitest-environment jsdom
//
// Pódio da Geral (TV): a pontuação é soma bruta × 10 e passa de mil com
// facilidade — precisa do separador de milhar pt-BR como o resto da página.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RankingPodio } from "../src/componentes/RankingPodio";
import type { PessoaGeral } from "../src/lib/tipos-api";

afterEach(() => cleanup());

function pessoa(id: number, rotulo: string, pontuacao: number, posicao: number): PessoaGeral {
  return { id_user: id, nome: rotulo, cargo: "sdr", rotulo, imagem_url: null, pontuacao, posicao, metricas: [] };
}

describe("RankingPodio", () => {
  it("mostra a pontuação com separador de milhar pt-BR", () => {
    render(<RankingPodio titulo="Ranking SDR" pessoas={[pessoa(1, "Nathan", 1230, 1), pessoa(2, "Jennifer", 980, 2)]} />);

    expect(screen.getByText("1.230 pts")).toBeTruthy();
    expect(screen.getByText("980 pts")).toBeTruthy();
  });
});
