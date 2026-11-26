// @vitest-environment jsdom
//
// Gráfico de ritmo da página de SDR: para cada SDR, a linha cheia do acumulado
// de inscrições (só até hoje) e a pontilhada do ritmo (na janela inteira).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GraficoRitmoSdr } from "../src/componentes/GraficoRitmoSdr";
import type { SdrPaginaSdr } from "../src/lib/tipos-api";

const JANELA = { inicio: "2026-11-20", fim: "2026-11-25" };
const DATAS = ["2026-11-20", "2026-11-21", "2026-11-23", "2026-11-24", "2026-11-25"];

function sdr(nome: string, idUser: string, acumulado: (number | null)[], ritmo: (number | null)[]): SdrPaginaSdr {
  return {
    id_user: idUser,
    nome,
    imagem_url: null,
    inscricoes: 0,
    meta_inscricoes: null,
    ligacoes: 0,
    pontuacao: 0,
    posicao: 1,
    meta_diaria: null,
    previsao: null,
    serie_evento: DATAS.map((data, i) => ({ data, acumulado: acumulado[i]!, ritmo: ritmo[i]! })),
  };
}

const SDRS = [
  sdr("Juca Silva", "1", [2, 5, 7, null, null], [4, 6, 9, 11, 15]),
  sdr("Jennifer Souza", "2", [1, 1, 3, null, null], [null, null, null, null, null]),
];

/** jsdom não faz layout: sem isto o SVG não teria caixa para medir. */
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 300,
    height: 238,
    right: 300,
    bottom: 238,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

function pontos(container: HTMLElement, serieNome: string): string[] {
  return container.querySelector(`[data-serie="${serieNome}"]`)?.getAttribute("points")?.split(" ") ?? [];
}

describe("GraficoRitmoSdr", () => {
  it("desenha para cada SDR a linha acumulada só até hoje e a pontilhada de ritmo na janela inteira", () => {
    const { container } = render(<GraficoRitmoSdr janela={JANELA} sdrs={SDRS} titulo="Imersão" />);

    expect(pontos(container, "real:Juca Silva")).toHaveLength(3);
    expect(pontos(container, "ritmo:Juca Silva")).toHaveLength(5);
    expect(container.querySelector('[data-serie="ritmo:Juca Silva"]')?.getAttribute("stroke-dasharray")).toBeTruthy();

    expect(pontos(container, "real:Jennifer Souza")).toHaveLength(3);
    expect(container.querySelector('[data-serie="ritmo:Jennifer Souza"]')).toBeNull();

    const rotulosX = Array.from(container.querySelectorAll('[data-eixo="x"] span')).map((s) => s.textContent);
    expect(rotulosX).toEqual(["20/11", "21/11", "23/11", "24/11", "25/11"]);

    const legenda = screen.getByText("Juca Silva").closest("ul") ?? container;
    expect(legenda.textContent).toContain("Juca Silva");
    expect(legenda.textContent).toContain("Jennifer Souza");
    expect(legenda.textContent).toContain("Ritmo (pontilhada)");

    expect(screen.getByRole("img", { name: /Imersão/ })).toBeTruthy();
    expect(screen.getByText("Ritmo de inscrições — Imersão")).toBeTruthy();
  });

  it("com janela longa mostra no máximo ~8 rótulos no eixo X, sempre o 1º e o último", () => {
    const novembro = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
    const longas = [...novembro, "2026-12-01"];
    const serieLonga: SdrPaginaSdr = {
      ...sdr("Juca Silva", "1", [], []),
      serie_evento: longas.map((data, i) => ({ data, acumulado: i, ritmo: i })),
    };

    const { container } = render(
      <GraficoRitmoSdr janela={{ inicio: "2026-11-01", fim: "2026-12-01" }} sdrs={[serieLonga]} titulo="Imersão" />,
    );

    const rotulosX = Array.from(container.querySelectorAll('[data-eixo="x"] span')).map((s) => s.textContent);
    expect(rotulosX).toEqual(["01/11", "05/11", "09/11", "13/11", "17/11", "21/11", "25/11", "29/11", "01/12"]);
  });

  it("sem janela e com semEvento, diz que não há evento", () => {
    render(<GraficoRitmoSdr janela={null} sdrs={[]} titulo="Imersão" semEvento />);

    expect(screen.getByText("Nenhum evento")).toBeTruthy();
  });

  it("sem janela e sem semEvento, diz que o evento ainda não tem inscrições", () => {
    render(<GraficoRitmoSdr janela={null} sdrs={[]} titulo="Imersão" />);

    expect(screen.getByText("Evento ainda sem inscrições")).toBeTruthy();
  });
});
