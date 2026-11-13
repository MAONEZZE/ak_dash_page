// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { PillConta } from "../src/componentes/PillConta";

function Busca() {
  const { search } = useLocation();
  return <div data-testid="busca">{search}</div>;
}

function montar() {
  render(
    <MemoryRouter initialEntries={["/funil-instagram?granularidade=mes"]}>
      <PillConta rotulo="Perfil" contas={["Mary", "akeel", "Jacob"]} />
      <Busca />
    </MemoryRouter>,
  );
}

describe("PillConta", () => {
  afterEach(() => cleanup());

  it("clicar numa conta grava ?conta= e Todas remove", () => {
    montar();
    const grupo = screen.getByRole("group", { name: "Perfil" });
    const botoes = within(grupo).getAllByRole("button");
    expect(botoes.map((b) => b.textContent)).toEqual(["Todas", "Mary", "akeel", "Jacob"]);

    fireEvent.click(within(grupo).getByRole("button", { name: "Mary" }));
    expect(screen.getByTestId("busca").textContent).toContain("conta=Mary");
    expect(screen.getByTestId("busca").textContent).toContain("granularidade=mes");
    expect(within(grupo).getByRole("button", { name: "Mary" }).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(within(grupo).getByRole("button", { name: "Todas" }));
    expect(screen.getByTestId("busca").textContent).not.toContain("conta");
    expect(within(grupo).getByRole("button", { name: "Todas" }).getAttribute("aria-pressed")).toBe("true");
  });
});
