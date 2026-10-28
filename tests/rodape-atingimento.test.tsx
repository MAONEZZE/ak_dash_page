// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RodapeAtingimento } from "../src/componentes/RodapeAtingimento";

afterEach(() => cleanup());

describe("RodapeAtingimento", () => {
  it("mostra Falta e % de atingimento com os números na cor do terço", () => {
    const { container } = render(
      <RodapeAtingimento meta={40} pct={20} faltaFolga={{ tipo: "falta", valor: 32 }} />,
    );

    expect(container.textContent).toContain("Falta 32");
    expect(container.textContent).toContain("20% de atingimento");
    expect(screen.getByText("32").className).toContain("text-bad");
    expect(screen.getByText("20%").className).toContain("text-bad");
  });

  it("mostra Folga quando passou da meta, em verde", () => {
    const { container } = render(
      <RodapeAtingimento meta={40} pct={105} faltaFolga={{ tipo: "folga", valor: 2 }} />,
    );

    expect(container.textContent).toContain("Folga 2");
    expect(container.textContent).toContain("105% de atingimento");
    expect(screen.getByText("2").className).toContain("text-ok");
    expect(screen.getByText("105%").className).toContain("text-ok");
  });

  it('sem meta mostra "Meta aberta" e nada de Falta ou %', () => {
    const { container, unmount } = render(
      <RodapeAtingimento meta={null} pct={null} faltaFolga={null} />,
    );

    expect(screen.getByText("Meta aberta")).toBeTruthy();
    expect(container.textContent).not.toContain("Falta");
    expect(container.textContent).not.toContain("atingimento");
    unmount();

    const { container: outro } = render(<RodapeAtingimento meta={0} pct={null} faltaFolga={null} />);

    expect(screen.getByText("Meta aberta")).toBeTruthy();
    expect(outro.textContent).not.toContain("Falta");
    expect(outro.textContent).not.toContain("atingimento");
  });
});
