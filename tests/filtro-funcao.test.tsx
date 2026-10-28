// @vitest-environment jsdom
// Filtro de função do header: combobox com uma checkbox por cargo. Mais de um
// cargo pode ficar marcado; a seleção mora na querystring (`squad=seller,sdr`).
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { PillSquad } from "../src/componentes/PillSquad";

function Espia() {
  const { search } = useLocation();
  return <span data-testid="busca">{decodeURIComponent(search)}</span>;
}

function montar(rota = "/comercial") {
  render(
    <MemoryRouter initialEntries={[rota]}>
      <PillSquad />
      <Espia />
    </MemoryRouter>,
  );
  return screen.getByRole("button", { name: /Função/ });
}

function marcadas(): string[] {
  return screen
    .getAllByRole("checkbox")
    .filter((c) => (c as HTMLInputElement).checked)
    .map((c) => c.closest("label")?.textContent ?? "");
}

afterEach(cleanup);

describe("filtro de função", () => {
  it("fechado, mostra 'Todos' e abre a lista com os três cargos marcados", () => {
    const botao = montar();
    expect(botao.textContent).toContain("Todos");
    expect(botao.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(botao);
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(marcadas()).toEqual(["Sellers", "SDRs", "Closers"]);
  });

  it("desmarcar Closers deixa Sellers e SDRs na querystring e no rótulo", () => {
    const botao = montar();
    fireEvent.click(botao);
    fireEvent.click(screen.getByRole("checkbox", { name: "Closers" }));

    expect(screen.getByTestId("busca").textContent).toBe("?squad=seller,sdr");
    expect(botao.textContent).toContain("Sellers, SDRs");
    expect(marcadas()).toEqual(["Sellers", "SDRs"]);
  });

  it("lê a seleção da querystring, inclusive o formato antigo de um cargo só", () => {
    const botao = montar("/comercial?squad=sdr");
    expect(botao.textContent).toContain("SDRs");
    fireEvent.click(botao);
    expect(marcadas()).toEqual(["SDRs"]);
  });

  it("o último cargo marcado não pode ser desmarcado", () => {
    montar("/comercial?squad=sdr");
    fireEvent.click(screen.getByRole("button", { name: /Função/ }));
    const sdr = screen.getByRole("checkbox", { name: "SDRs" }) as HTMLInputElement;
    expect(sdr.disabled).toBe(true);
  });

  it("marcar os três volta pra 'Todos' e tira o filtro da querystring", () => {
    const botao = montar("/comercial?squad=seller,sdr");
    fireEvent.click(botao);
    fireEvent.click(screen.getByRole("checkbox", { name: "Closers" }));

    expect(screen.getByTestId("busca").textContent).toBe("");
    expect(botao.textContent).toContain("Todos");
  });

  it("Escape fecha a lista", () => {
    const botao = montar();
    fireEvent.click(botao);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});
