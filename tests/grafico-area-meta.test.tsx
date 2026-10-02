// @vitest-environment jsdom
//
// Gráfico do "Acompanhamento do mês" da Comercial: sempre o mês corrente
// inteiro no eixo X. Mostra o realizado ACUMULADO até hoje, o ritmo da meta
// acumulado por dia útil (a meta dividida igual entre os dias úteis seg–sex),
// a linha da meta, o marcador de hoje e a projeção até o fim do mês pela média
// por dia útil.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GraficoAreaMeta } from "../src/componentes/GraficoAreaMeta";

// Quinta, 10/09/2026. Setembro/2026 começa numa terça: dias úteis de 1 a 10 =
// 8; no mês inteiro = 22.
const HOJE = "2026-09-10";
const DIAS_DE_SETEMBRO = 30;
const DIAS_UTEIS = { decorridos: 8, total: 22 };
const OPCOES = [
  { id: "sdr:fups", rotulo: "Follow-ups" },
  { id: "sdr:numeros_captados", rotulo: "Números Captados" },
];

/** Mês inteiro pré-zerado, como o BFF entrega — `valorPorDia` preenche os dias que já aconteceram. */
function serie(valorPorDia: Record<number, number> = {}) {
  return Array.from({ length: DIAS_DE_SETEMBRO }, (_, i) => ({
    dia: `2026-09-${String(i + 1).padStart(2, "0")}`,
    valor: valorPorDia[i + 1] ?? 0,
  }));
}

function montar(props: Partial<Parameters<typeof GraficoAreaMeta>[0]> = {}) {
  return render(
    <GraficoAreaMeta
      opcoes={OPCOES}
      selecionada="sdr:fups"
      aoSelecionar={() => undefined}
      serie={serie({ 1: 10, 2: 20, 10: 10 })}
      meta={220}
      diasUteis={DIAS_UTEIS}
      {...props}
    />,
  );
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

function pontos(container: HTMLElement, serieNome: string): string[] {
  return container.querySelector(`[data-serie="${serieNome}"]`)?.getAttribute("points")?.split(" ") ?? [];
}

describe("GraficoAreaMeta", () => {
  it("mostra no eixo X todos os dias do mês, inclusive os que ainda não aconteceram", () => {
    const { container } = montar();

    const rotulosX = Array.from(container.querySelectorAll('[data-eixo="x"] span')).map((s) => s.textContent);
    expect(rotulosX).toHaveLength(DIAS_DE_SETEMBRO);
    expect(rotulosX[0]).toBe("1");
    expect(rotulosX.at(-1)).toBe(String(DIAS_DE_SETEMBRO));
  });

  it("desenha o realizado acumulado só até hoje", () => {
    const { container } = montar();

    expect(pontos(container, "realizado")).toHaveLength(10); // dia 1 ao dia 10 (hoje)
    expect(screen.getByRole("img").textContent).toContain("Realizado acumulado até hoje: 40.");
  });

  it("o ritmo da meta cobre o mês inteiro e hoje vale meta × dias úteis decorridos / total", () => {
    const { container } = montar();

    expect(pontos(container, "ritmo")).toHaveLength(DIAS_DE_SETEMBRO);
    // 220 × 8 / 22 = 80
    expect(screen.getByRole("img").textContent).toContain("Esperado hoje pelo ritmo da meta: 80.");
  });

  it("projeta de hoje até o fim do mês pela média por dia útil", () => {
    const { container } = montar();

    // Média 40 / 8 = 5 por dia útil; faltam 14 dias úteis → 40 + 70 = 110.
    expect(pontos(container, "projecao")).toHaveLength(DIAS_DE_SETEMBRO - 9);
    expect(screen.getByRole("img").textContent).toContain("Projeção para o fim do mês, mantendo a média por dia útil: 110.");
  });

  it("mostra a linha da meta com rótulo, o marcador de hoje e a legenda", () => {
    const { container } = montar();

    expect(container.querySelector('[data-serie="meta"]')).not.toBeNull();
    expect(container.querySelector('[data-serie="hoje"]')).not.toBeNull();
    expect(screen.getByText("Meta 220")).toBeTruthy();
    expect(screen.getByText("Hoje")).toBeTruthy();
    const legenda = screen.getByRole("list", { name: "Legenda" }).textContent;
    for (const item of ["Realizado", "Ritmo da meta", "Projeção", "Meta"]) expect(legenda).toContain(item);
  });

  it("sem meta não desenha linha de meta nem de ritmo, e diz isso no resumo", () => {
    const { container } = montar({ meta: null });

    expect(container.querySelector('[data-serie="meta"]')).toBeNull();
    expect(container.querySelector('[data-serie="ritmo"]')).toBeNull();
    expect(screen.getByRole("img").textContent).toContain("Sem meta definida no período.");
  });

  it("o eixo Y acompanha a meta, não uma escala fixa", () => {
    const { container } = montar({ meta: 2200 });

    const rotulosY = Array.from(container.querySelectorAll('[data-eixo="y"] span')).map((s) => s.textContent);
    expect(Number(rotulosY[0]!.replace(/\./g, ""))).toBeGreaterThanOrEqual(2200);
    expect(rotulosY.at(-1)).toBe("0");
  });

  it("mostra o acumulado e o valor do dia sob o cursor", () => {
    const { container } = montar();
    const plot = container.querySelector("svg")!.parentElement!;

    expect(screen.queryByRole("tooltip")).toBeNull();
    // Dia 2 = índice 1 de 29 intervalos.
    fireEvent.mouseMove(plot, { clientX: (1 / (DIAS_DE_SETEMBRO - 1)) * LARGURA_PLOT });

    const balao = screen.getByRole("tooltip").textContent;
    expect(balao).toContain("Dia 2");
    expect(balao).toContain("30");
    expect(balao).toContain("+20 no dia");

    fireEvent.mouseLeave(plot);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("hover em dia futuro cai em hoje, não num dia que não aconteceu", () => {
    const { container } = montar();
    const plot = container.querySelector("svg")!.parentElement!;

    fireEvent.mouseMove(plot, { clientX: LARGURA_PLOT }); // ponta direita = dia 30

    expect(screen.getByRole("tooltip").textContent).toContain("Dia 10");
  });

  it("hoje é o dia de São Paulo, não o de UTC: às 23h30 do dia 10 o marcador continua no dia 10", () => {
    // 23h30 em São Paulo (UTC−3) já é dia 11 em UTC. A TV fica ligada à noite.
    const fusoAntes = process.env.TZ;
    process.env.TZ = "America/Sao_Paulo";
    try {
      vi.setSystemTime(new Date("2026-09-11T02:30:00Z"));
      const { container } = montar();

      expect(pontos(container, "realizado")).toHaveLength(10);
      // Dia 10 = índice 9 de 29 intervalos.
      expect(Number(container.querySelector('[data-serie="hoje"]')?.getAttribute("x1"))).toBeCloseTo((9 / 29) * 900, 1);
      expect(screen.getByRole("img").textContent).toContain("Esperado hoje pelo ritmo da meta: 80.");
    } finally {
      process.env.TZ = fusoAntes;
    }
  });

  it("trocar a métrica no select avisa quem controla a seleção", () => {
    const aoSelecionar = vi.fn();
    montar({ aoSelecionar });

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "sdr:numeros_captados" } });
    expect(aoSelecionar).toHaveBeenCalledWith("sdr:numeros_captados");
  });
});
