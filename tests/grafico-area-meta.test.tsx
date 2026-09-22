// @vitest-environment jsdom
//
// Os dois eixos do gráfico da Comercial são fixos (decisão de produto):
// X = todos os dias do mês corrente, Y = 0 a 150 de 50 em 50. Nada de escala
// que acompanha o maior valor da série nem de eixo que encolhe conforme o mês
// começa — o desenho é o mesmo no dia 1 e no dia 30.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GraficoAreaMeta, type FonteSerie } from "../src/componentes/GraficoAreaMeta";
import type { Metrica } from "../src/lib/tipos-api";

const HOJE = "2026-09-10";
const DIAS_DE_SETEMBRO = 30;

const METRICA: Metrica = {
  metrica: "fups",
  nome_exibicao: "Follow-ups",
  meta_periodo: 100,
  realizado: 12,
  status: "abaixo_da_meta",
  dias_com_lacuna: 0,
};

/** Mês inteiro pré-zerado, como o BFF entrega — `valorPorDia` preenche os dias que já aconteceram. */
function fonte(valorPorDia: Record<number, number> = {}): FonteSerie {
  return {
    metricas: [METRICA],
    serieDiaria: Array.from({ length: DIAS_DE_SETEMBRO }, (_, i) => ({
      dia: `2026-09-${String(i + 1).padStart(2, "0")}`,
      metricas: { fups: valorPorDia[i + 1] ?? 0 },
    })),
  };
}

/** jsdom não faz layout: sem isto toda caixa mede 0 e o hover não teria onde cair. */
const LARGURA_PLOT = 300;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${HOJE}T12:00:00Z`));
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: LARGURA_PLOT,
    height: 238,
    right: LARGURA_PLOT,
    bottom: 238,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  cleanup();
});

describe("GraficoAreaMeta", () => {
  it("rotula o eixo Y de 0 a 150, de 50 em 50", () => {
    const { container } = render(<GraficoAreaMeta titulo="Dias do mês atual" fontes={[fonte({ 1: 10, 2: 20 })]} />);

    const rotulosY = Array.from(container.querySelectorAll('[data-eixo="y"] span')).map((s) => s.textContent);
    expect(rotulosY).toEqual(["150", "100", "50", "0"]);
  });

  it("mostra no eixo X todos os dias do mês, inclusive os que ainda não aconteceram", () => {
    const { container } = render(<GraficoAreaMeta titulo="Dias do mês atual" fontes={[fonte({ 1: 10, 2: 20 })]} />);

    const rotulosX = Array.from(container.querySelectorAll('[data-eixo="x"] span')).map((s) => s.textContent);
    expect(rotulosX).toHaveLength(DIAS_DE_SETEMBRO);
    expect(rotulosX[0]).toBe("1");
    expect(rotulosX.at(-1)).toBe(String(DIAS_DE_SETEMBRO));
  });

  it("desenha a linha só até hoje — dia futuro não puxa o traço pra zero", () => {
    const { container } = render(<GraficoAreaMeta titulo="Dias do mês atual" fontes={[fonte({ 1: 10, 2: 20 })]} />);

    const pontos = container.querySelector("polyline")?.getAttribute("points")?.split(" ") ?? [];
    expect(pontos).toHaveLength(10); // dia 1 ao dia 10 (hoje), nada dos 20 dias restantes
  });

  it("mostra o valor do dia sob o cursor ao passar o mouse", () => {
    const { container } = render(<GraficoAreaMeta titulo="Dias do mês atual" fontes={[fonte({ 1: 10, 3: 42 })]} />);
    const plot = container.querySelector("svg")!.parentElement!;

    expect(screen.queryByRole("tooltip")).toBeNull();

    // Dia 3 = índice 2 de 29 intervalos.
    fireEvent.mouseMove(plot, { clientX: (2 / (DIAS_DE_SETEMBRO - 1)) * LARGURA_PLOT });

    const balao = screen.getByRole("tooltip");
    expect(balao.textContent).toContain("Dia 3");
    expect(balao.textContent).toContain("42");

    fireEvent.mouseLeave(plot);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("hover em dia futuro cai no último dia com valor, não num zero de dia que não aconteceu", () => {
    const { container } = render(<GraficoAreaMeta titulo="Dias do mês atual" fontes={[fonte({ 1: 10, 10: 77 })]} />);
    const plot = container.querySelector("svg")!.parentElement!;

    fireEvent.mouseMove(plot, { clientX: LARGURA_PLOT }); // ponta direita = dia 30

    expect(screen.getByRole("tooltip").textContent).toContain("Dia 10");
    expect(screen.getByRole("tooltip").textContent).toContain("77");
  });

  it("o rótulo do dia fica em cima do ponto dele — mirar no rótulo acerta o mesmo dia", () => {
    // O bug: com `justify-between` os números de 1 e 2 dígitos têm larguras
    // diferentes, o rótulo "20" era desenhado ~40px à esquerda do ponto do dia
    // 20, e quem mirava nele caía no dia 18/19.
    vi.setSystemTime(new Date("2026-09-25T12:00:00Z"));
    const { container } = render(<GraficoAreaMeta titulo="Dias do mês atual" fontes={[fonte({ 20: 64 })]} />);
    const plot = container.querySelector("svg")!.parentElement!;

    const rotulos = Array.from(container.querySelectorAll('[data-eixo="x"] span')) as HTMLElement[];
    const fracaoDoDia20 = 19 / (DIAS_DE_SETEMBRO - 1);
    expect(rotulos[19].textContent).toBe("20");
    expect(rotulos[19].style.left).toBe(`${fracaoDoDia20 * 100}%`);

    fireEvent.mouseMove(plot, { clientX: fracaoDoDia20 * LARGURA_PLOT });

    const balao = screen.getByRole("tooltip");
    expect(balao.textContent).toContain("Dia 20");
    expect(balao.textContent).toContain("64");
  });

  it("posiciona o valor pela escala fixa, não pelo maior valor da série", () => {
    // Com escala automática, 75 seria o topo do gráfico; na escala 0–150 ele
    // fica na metade da altura (y = 120 de 240).
    const { container } = render(<GraficoAreaMeta titulo="Dias do mês atual" fontes={[fonte({ 1: 75, 2: 150 })]} />);

    const pontos = container.querySelector("polyline")?.getAttribute("points")?.split(" ") ?? [];
    expect(pontos[0]).toBe("0.0,120.0");
    expect(pontos[1].split(",")[1]).toBe("0.0"); // 150 = topo
  });
});
