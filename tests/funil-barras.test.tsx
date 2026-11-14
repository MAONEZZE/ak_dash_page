// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { FunilBarras, type EtapaFunil } from "../src/componentes/FunilBarras";

afterEach(() => cleanup());

it("mostra etapas em ordem com barra proporcional, taxa de passagem e nota lateral", () => {
  const etapas: EtapaFunil[] = [
    { rotulo: "Conexões Enviadas", valor: 1621, passagem: { taxa: 0.58, texto: "aceitaram", textoPerda: "não aceitaram" } },
    { rotulo: "Conexões Aceitas", valor: 940, passagem: { taxa: null, texto: "abordados", textoPerda: "não abordados" } },
    { rotulo: "Números Captados", valor: 89 },
  ];
  const lateral = { rotulo: "Follow de abordagem", texto: "713 (0,8 por abordagem)", aoLadoDe: 1 };

  render(<FunilBarras titulo="Funil LinkedIn" etapas={etapas} lateral={lateral} />);

  const lista = screen.getByRole("list", { name: "Funil LinkedIn" });
  const itens = within(lista).getAllByRole("listitem");
  expect(itens).toHaveLength(3);

  expect(itens[0].textContent).toContain("Conexões Enviadas");
  expect(itens[0].textContent).toContain("1.621");
  expect(itens[0].textContent).toContain("↓ 58,0% aceitaram");

  expect(itens[1].textContent).toContain("940");
  expect(itens[1].textContent).toContain("↓ — abordados");
  expect(itens[1].textContent).toContain("Follow de abordagem");
  expect(itens[1].textContent).toContain("713 (0,8 por abordagem)");

  expect(itens[2].textContent).toContain("89");
  expect(itens[2].textContent).not.toContain("↓");

  const barras = itens.map((item) => item.querySelector<HTMLElement>("[data-barra]"));
  expect(barras.map((b) => b?.style.width)).toEqual(["100%", "58%", "8%"]);

  expect(itens[0].textContent).not.toContain("Follow de abordagem");
  expect(itens[2].textContent).not.toContain("Follow de abordagem");
});

it("mostra a perda de cada passagem e marca a de menor taxa como maior perda", () => {
  const etapas: EtapaFunil[] = [
    { rotulo: "Enviadas", valor: 1621, passagem: { taxa: 0.58, texto: "aceitaram", textoPerda: "não aceitaram" } },
    { rotulo: "Aceitas", valor: 940, passagem: { taxa: 0.185, texto: "viraram número", textoPerda: "não viraram número" } },
    { rotulo: "Números", valor: 174, passagem: { taxa: 1.2, texto: "indicaram", textoPerda: "não indicaram" } },
    { rotulo: "Indicações", valor: 200 },
  ];

  const { rerender } = render(<FunilBarras titulo="Funil" etapas={etapas} />);

  const lista = screen.getByRole("list", { name: "Funil" });
  const itens = within(lista).getAllByRole("listitem");

  expect(itens[0].textContent).toContain("−681 não aceitaram");
  expect(itens[0].textContent).not.toContain("maior perda");

  expect(itens[1].textContent).toContain("−766 não viraram número");
  expect(itens[1].textContent).toContain("maior perda");
  expect(itens[1].querySelector("[data-passagem]")?.getAttribute("data-gargalo")).toBe("true");

  expect(itens[2].textContent).not.toContain("não indicaram");

  expect(document.querySelectorAll("[data-gargalo]")).toHaveLength(1);

  rerender(<FunilBarras titulo="Funil" etapas={[etapas[0], { rotulo: "Aceitas", valor: 940 }]} />);

  expect(document.querySelectorAll("[data-gargalo]")).toHaveLength(0);
  expect(screen.queryByText("maior perda")).toBeNull();
});
