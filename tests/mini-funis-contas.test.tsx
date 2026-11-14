// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MiniFunisContas, type ContaMiniFunil } from "../src/componentes/MiniFunisContas";

afterEach(() => cleanup());

it("mostra um mini-funil por conta com valores, barras e conversão total", () => {
  const contas: ContaMiniFunil[] = [
    {
      nome: "Mary",
      conversaoTotal: 0.06,
      etapas: [
        { rotulo: "Abordagens feitas", valor: 100 },
        { rotulo: "Respondidos", valor: 30 },
        { rotulo: "Números Captados", valor: 6 },
      ],
    },
    {
      nome: "Jacob",
      conversaoTotal: null,
      etapas: [
        { rotulo: "Abordagens feitas", valor: 0 },
        { rotulo: "Respondidos", valor: 0 },
        { rotulo: "Números Captados", valor: 0 },
      ],
    },
  ];

  render(
    <MemoryRouter>
      <MiniFunisContas titulo="Funil por perfil" contas={contas} />
    </MemoryRouter>,
  );

  const regiao = screen.getByRole("region", { name: "Funil por perfil" });
  const botoes = within(regiao).getAllByRole("button");
  expect(botoes).toHaveLength(2);

  const mary = within(regiao).getByRole("button", { name: /Mary/ });
  expect(mary.textContent).toContain("6,0%");
  expect(mary.textContent).toContain("Abordagens feitas");
  expect(mary.textContent).toContain("100");
  expect(mary.textContent).toContain("30");
  expect(mary.textContent).toContain("6");
  const barrasMary = Array.from(mary.querySelectorAll<HTMLElement>("[data-barra]"));
  expect(barrasMary.map((b) => b.style.width)).toEqual(["100%", "30%", "8%"]);

  const jacob = within(regiao).getByRole("button", { name: /Jacob/ });
  expect(jacob.textContent).toContain("—");
  const barrasJacob = Array.from(jacob.querySelectorAll<HTMLElement>("[data-barra]"));
  expect(barrasJacob.map((b) => b.style.width)).toEqual(["8%", "8%", "8%"]);
});
