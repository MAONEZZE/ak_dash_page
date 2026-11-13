// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { FunilEscada, type EtapaFunil } from "../src/componentes/FunilEscada";

afterEach(() => cleanup());

it("mostra etapas em ordem, a taxa de passagem e a etapa lateral", () => {
  const etapas: EtapaFunil[] = [
    { rotulo: "Conexões Enviadas", valor: 1621, passagem: { taxa: 0.58, texto: "aceitaram" } },
    { rotulo: "Conexões Aceitas", valor: 940 },
  ];
  const lateral = { rotulo: "Follow de abordagem", texto: "713 (0,8 por abordagem)", aoLadoDe: 1 };

  const { rerender } = render(<FunilEscada titulo="Funil LinkedIn" etapas={etapas} lateral={lateral} />);

  const lista = screen.getByRole("list", { name: "Funil LinkedIn" });
  const itens = within(lista).getAllByRole("listitem");
  expect(itens).toHaveLength(2);

  expect(itens[0].textContent).toContain("Conexões Enviadas");
  expect(itens[0].textContent).toContain("1.621");
  expect(itens[0].textContent).toContain("↓ 58,0% aceitaram");

  expect(itens[1].textContent).toContain("940");
  expect(itens[1].textContent).toContain("Follow de abordagem");
  expect(itens[1].textContent).toContain("713 (0,8 por abordagem)");

  rerender(
    <FunilEscada
      titulo="Funil LinkedIn"
      etapas={[{ ...etapas[0], passagem: { taxa: null, texto: "aceitaram" } }, etapas[1]]}
      lateral={lateral}
    />,
  );

  const itensSemTaxa = within(screen.getByRole("list", { name: "Funil LinkedIn" })).getAllByRole("listitem");
  expect(itensSemTaxa[0].textContent).toContain("↓ — aceitaram");
});
