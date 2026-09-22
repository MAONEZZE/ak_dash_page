// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GraficoLinhasFinanceiro } from "../src/componentes/GraficoLinhasFinanceiro";

/** Largura do viewBox — casando com ela, o clientX do teste é a própria coordenada do gráfico. */
const LARGURA_PLOT = 900;

describe("GraficoLinhasFinanceiro", () => {
  // jsdom não faz layout: sem isto toda caixa mede 0 e o hover não teria onde cair.
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: LARGURA_PLOT,
      height: 260,
      right: LARGURA_PLOT,
      bottom: 260,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("mostra os números do eixo Y (0 até o piso) fora do SVG, sem distorção do preserveAspectRatio", () => {
    const { container } = render(
      <GraficoLinhasFinanceiro
        titulo="Vendido"
        series={[{ rotulo: "Vendido", valores: Array(12).fill(500_000), cor: "accent" }]}
        piso={1_000_000}
        multiploTeto={250_000}
      />,
    );

    const rotulos = Array.from(container.querySelectorAll("svg + div, div > span")).map((el) => el.textContent);
    expect(container.textContent).toContain("1.000.000");
    expect(container.textContent).toContain("750.000");
    expect(container.textContent).toContain("500.000");
    expect(container.textContent).toContain("250.000");
    expect(container.textContent).toContain("0");
    // Nenhum <text> dentro do svg — os rótulos vivem em HTML normal, fora do preserveAspectRatio="none".
    expect(container.querySelector("svg text")).toBeNull();
    expect(rotulos.length).toBeGreaterThan(0);
  });

  it("desenha um ponto (redondo, tamanho fixo em px) em cada um dos 12 meses, por série", () => {
    const { container } = render(
      <GraficoLinhasFinanceiro
        titulo="Pago × Líquido"
        series={[
          { rotulo: "Pago", valores: Array(12).fill(100_000), cor: "status-bad" },
          { rotulo: "Líquido", valores: Array(12).fill(80_000), cor: "status-bad", tracejada: true },
        ]}
        piso={300_000}
        multiploTeto={100_000}
      />,
    );

    // Os pontos são HTML (`rounded-full`), não `<circle>` do SVG — dentro do
    // SVG com `preserveAspectRatio="none"` eles sairiam como elipse achatada
    // (escala X ≠ escala Y). Fora do SVG, com tamanho fixo em px, ficam redondos.
    expect(container.querySelectorAll("svg circle")).toHaveLength(0);
    const pontos = Array.from(container.querySelectorAll(".rounded-full"));
    expect(pontos).toHaveLength(24);
    for (const ponto of pontos) {
      const estilo = (ponto as HTMLElement).style;
      expect(estilo.width).toBe(estilo.height);
    }
  });

  it("a grade (linhas de cruzamento X/Y) é pontilhada e discreta, não sólida", () => {
    const { container } = render(
      <GraficoLinhasFinanceiro
        titulo="Vendido"
        series={[{ rotulo: "Vendido", valores: Array(12).fill(0), cor: "accent" }]}
        piso={1_000_000}
        multiploTeto={250_000}
      />,
    );

    const linhas = Array.from(container.querySelectorAll("line"));
    expect(linhas.length).toBeGreaterThan(0);
    for (const linha of linhas) {
      expect(linha.getAttribute("stroke-dasharray")).toBeTruthy();
      expect(linha.getAttribute("class")).toContain("stroke-border-2");
    }
    // 5 horizontais (0/25/50/75/100% do teto) + 12 verticais (uma por mês).
    expect(linhas).toHaveLength(5 + 12);
  });

  it("a série tracejada usa stroke-dasharray na linha, a sólida não", () => {
    const { container } = render(
      <GraficoLinhasFinanceiro
        titulo="Pago × Líquido"
        series={[
          { rotulo: "Pago", valores: Array(12).fill(100_000), cor: "status-bad" },
          { rotulo: "Líquido", valores: Array(12).fill(80_000), cor: "status-bad", tracejada: true },
        ]}
        piso={300_000}
        multiploTeto={100_000}
      />,
    );

    const polylines = Array.from(container.querySelectorAll("polyline"));
    expect(polylines).toHaveLength(2);
    expect(polylines[0].getAttribute("stroke-dasharray")).toBeNull();
    expect(polylines[1].getAttribute("stroke-dasharray")).toBe("7 5");
  });

  it("teto elástico: valor acima do piso estica o eixo pro próximo múltiplo", () => {
    const { container } = render(
      <GraficoLinhasFinanceiro
        titulo="Vendido"
        series={[{ rotulo: "Vendido", valores: [...Array(11).fill(0), 1_100_000], cor: "accent" }]}
        piso={1_000_000}
        multiploTeto={250_000}
      />,
    );

    expect(container.textContent).toContain("1.250.000");
  });

  it("mostra o valor de cada série no mês sob o cursor ao passar o mouse", () => {
    const valores = Array(12).fill(100_000);
    valores[5] = 137_500;
    const { container } = render(
      <GraficoLinhasFinanceiro
        titulo="Pago × Líquido"
        series={[
          { rotulo: "Pago", valores, cor: "status-bad" },
          { rotulo: "Líquido", valores: Array(12).fill(80_000), cor: "status-bad", tracejada: true },
        ]}
        piso={300_000}
        multiploTeto={100_000}
      />,
    );
    const plot = container.querySelector("svg")!.parentElement!;

    expect(screen.queryByRole("tooltip")).toBeNull();

    // Junho = índice 5; x(5) = PL + (5/11) * (900 - PL - PR).
    fireEvent.mouseMove(plot, { clientX: 8 + (5 / 11) * (LARGURA_PLOT - 16) });

    const balao = screen.getByRole("tooltip");
    expect(balao.textContent).toContain("Jun");
    expect(balao.textContent).toContain("137.500");
    expect(balao.textContent).toContain("80.000");

    fireEvent.mouseLeave(plot);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
