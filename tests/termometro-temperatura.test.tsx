// @vitest-environment jsdom
//
// Termômetro de faturamento da Geral: a temperatura (cor + cena de neve,
// neve derretendo ou fogo) sai do % da meta — frio < 40, médio 40–79,
// quente ≥ 80, inclusive acima de 100%.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Termometro } from "../src/componentes/Termometro";

afterEach(() => cleanup());

function temperaturaCom(realizado: number): string | null {
  render(<Termometro dado={{ realizado, meta: 380_000 }} />);
  return screen.getByRole("article", { name: "Termômetro de faturamento" }).getAttribute("data-temperatura");
}

describe("Termometro", () => {
  it.each([
    [0, "frio"],
    [151_999, "frio"], // 39,99%
    [152_000, "medio"], // 40%
    [303_999, "medio"], // 79,99%
    [304_000, "quente"], // 80%
    [500_000, "quente"], // passou da meta
  ])("R$ %i de R$ 380.000 → %s", (realizado, esperado) => {
    expect(temperaturaCom(realizado)).toBe(esperado);
  });

  it("passou da meta: tubo cheio e o percentual mostra quanto passou", () => {
    render(<Termometro dado={{ realizado: 418_000, meta: 380_000 }} />);
    expect(screen.getByText("110% da meta")).toBeTruthy();
  });

  it("sem dado não quebra", () => {
    render(<Termometro dado={null} />);
    expect(screen.getByText("Sem dado de faturamento.")).toBeTruthy();
  });
});
