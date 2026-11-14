// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { MiniFunisContas, type ContaMiniFunil } from "../src/componentes/MiniFunisContas";

afterEach(() => cleanup());

function Sonda() {
  return <output>{useLocation().search}</output>;
}

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

it("clicar num mini-funil grava ?conta= e clicar de novo remove", () => {
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
    <MemoryRouter initialEntries={["/funil-instagram?granularidade=mes"]}>
      <MiniFunisContas titulo="Funil por perfil" contas={contas} />
      <Sonda />
    </MemoryRouter>,
  );

  const regiao = screen.getByRole("region", { name: "Funil por perfil" });
  const mary = within(regiao).getByRole("button", { name: /Mary/ });
  const jacob = within(regiao).getByRole("button", { name: /Jacob/ });
  expect(mary.getAttribute("aria-pressed")).toBe("false");
  expect(jacob.getAttribute("aria-pressed")).toBe("false");
  expect(mary.classList.contains("opacity-50")).toBe(false);
  expect(jacob.classList.contains("opacity-50")).toBe(false);

  fireEvent.click(mary);
  expect(screen.getByRole("status").textContent).toContain("conta=Mary");
  expect(screen.getByRole("status").textContent).toContain("granularidade=mes");
  expect(mary.getAttribute("aria-pressed")).toBe("true");
  expect(mary.classList.contains("opacity-50")).toBe(false);
  expect(jacob.getAttribute("aria-pressed")).toBe("false");
  expect(jacob.classList.contains("opacity-50")).toBe(true);

  fireEvent.click(mary);
  expect(screen.getByRole("status").textContent).not.toContain("conta=");
  expect(screen.getByRole("status").textContent).toContain("granularidade=mes");
  expect(mary.getAttribute("aria-pressed")).toBe("false");
  expect(jacob.getAttribute("aria-pressed")).toBe("false");
});
