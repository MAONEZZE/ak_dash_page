// @vitest-environment jsdom
//
// Pódio da Geral (TV): a pontuação é soma bruta × 10 e passa de mil com
// facilidade — precisa do separador de milhar pt-BR como o resto da página.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RankingPodio } from "../src/componentes/RankingPodio";
import type { PessoaComercial } from "../src/lib/tipos-api";

afterEach(() => cleanup());

function pessoa(id: number, nome: string, pontuacao: number | null, posicao: number | null): PessoaComercial {
  return {
    id_user: String(id),
    email: null,
    nome,
    imagem_url: null,
    metas_atingidas: { atingidas: 0, total: 0 },
    metricas: [],
    pontuacao_total: pontuacao,
    posicao,
    contas_origem: [],
  };
}

describe("RankingPodio", () => {
  it("usa pontuação comercial, limita ao top 3 e aplica o verde escuro", () => {
    render(
      <RankingPodio
        cargo="sdr"
        pessoas={[
          pessoa(4, "Quarto", 400, 4),
          pessoa(2, "Segundo", 980, 2),
          pessoa(5, "Sem classificação", null, null),
          pessoa(1, "Primeiro", 1230, 1),
          pessoa(3, "Terceiro", 750, 3),
        ]}
      />,
    );

    const article = screen.getByRole("article", { name: "Ranking SDR" });
    expect(article.textContent).toContain("1.230 pts");
    expect(article.querySelector(".order-1")?.textContent).toContain("Segundo");
    expect(article.querySelector(".order-2")?.textContent).toContain("Primeiro");
    expect(article.querySelector(".order-3")?.textContent).toContain("Terceiro");
    expect(article.textContent).not.toContain("Quarto");
    expect(article.textContent).not.toContain("Sem classificação");
    expect(article.className).toContain("card-pastel pastel-verde-escuro rounded-[24px]");
  });
});
