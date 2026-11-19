// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { FunilBarras, type EtapaFunil } from "../src/componentes/FunilBarras";

afterEach(() => cleanup());

it("mostra etapas em ordem no formato de funil, taxa de passagem e nota no rodapé", () => {
  const etapas: EtapaFunil[] = [
    { rotulo: "Conexões Enviadas", valor: 1621, passagem: { taxa: 0.58, texto: "aceitaram" } },
    { rotulo: "Conexões Aceitas", valor: 940, passagem: { taxa: null, texto: "abordados" } },
    { rotulo: "Números Captados", valor: 89 },
  ];
  const lateral = { rotulo: "Follow de abordagem", texto: "713 (0,8 por abordagem)", aoLadoDe: 1 };

  render(<FunilBarras titulo="Funil LinkedIn" etapas={etapas} lateral={lateral} conversaoTotal={null} />);

  const lista = screen.getByRole("list", { name: "Funil LinkedIn" });
  const itens = within(lista).getAllByRole("listitem");
  expect(itens).toHaveLength(3);

  expect(itens[0].textContent).toContain("Conexões Enviadas");
  expect(itens[0].textContent).toContain("1.621");
  expect(itens[0].textContent).toContain("↓ 58,0% aceitaram");

  expect(itens[1].textContent).toContain("940");
  expect(itens[1].textContent).toContain("↓ — abordados");
  expect(itens[1].textContent).not.toContain("Follow de abordagem");
  expect(document.querySelector("[data-nota-rodape]")?.textContent).toBe("* Follow de abordagem: 713 (0,8 por abordagem)");

  expect(itens[2].textContent).toContain("89");
  expect(itens[2].textContent).not.toContain("↓");

  const segmentos = itens.map((item) => item.querySelector<HTMLElement>("[data-segmento]"));
  expect(segmentos.map((s) => [s?.dataset.larguraTopo, s?.dataset.larguraBase])).toEqual([
    ["100", "78"],
    ["78", "56"],
    ["56", "34"],
  ]);

  expect(itens[0].textContent).not.toContain("Follow de abordagem");
  expect(itens[2].textContent).not.toContain("Follow de abordagem");
});

it("não escreve a perda em cada passagem e marca a de menor taxa como maior perda", () => {
  const etapas: EtapaFunil[] = [
    { rotulo: "Enviadas", valor: 1621, passagem: { taxa: 0.58, texto: "aceitaram" } },
    { rotulo: "Aceitas", valor: 940, passagem: { taxa: 0.185, texto: "viraram número" } },
    { rotulo: "Números", valor: 174, passagem: { taxa: 1.2, texto: "indicaram" } },
    { rotulo: "Indicações", valor: 200 },
  ];

  const { rerender } = render(<FunilBarras titulo="Funil" etapas={etapas} conversaoTotal={null} />);

  const lista = screen.getByRole("list", { name: "Funil" });
  const itens = within(lista).getAllByRole("listitem");

  expect(itens[0].textContent).not.toContain("−681");
  expect(itens[0].textContent).not.toContain("maior perda");

  expect(itens[1].textContent).not.toContain("−766");
  expect(itens[1].textContent).toContain("maior perda");
  expect(itens[1].querySelector("[data-passagem]")?.getAttribute("data-gargalo")).toBe("true");

  expect(itens[2].textContent).not.toContain("não indicaram");

  expect(document.querySelectorAll("[data-gargalo]")).toHaveLength(1);

  rerender(<FunilBarras titulo="Funil" etapas={[etapas[0], { rotulo: "Aceitas", valor: 940 }]} conversaoTotal={null} />);

  expect(document.querySelectorAll("[data-gargalo]")).toHaveLength(0);
  expect(screen.queryByText("maior perda")).toBeNull();
});

it("mostra o título e a conversão total do funil no cabeçalho", () => {
  const etapas: EtapaFunil[] = [{ rotulo: "Abordagens", valor: 200 }];

  const { rerender } = render(<FunilBarras titulo="Funil Instagram" etapas={etapas} conversaoTotal={0.05} />);

  expect(screen.getByRole("heading", { level: 2, name: "Funil Instagram" })).toBeTruthy();
  expect(screen.getByRole("group", { name: "Conversão total do funil" }).textContent).toContain("5,0%");

  rerender(<FunilBarras titulo="Funil Instagram" etapas={etapas} conversaoTotal={null} />);

  expect(screen.getByRole("group", { name: "Conversão total do funil" }).textContent).toContain("—");
});

it("mantém o formato de funil e mostra 0 nas etapas sem registro", () => {
  const etapas: EtapaFunil[] = [
    { rotulo: "Abordagens feitas", valor: 0, passagem: { taxa: null, texto: "responderam" } },
    { rotulo: "Respondidos", valor: 0, passagem: { taxa: null, texto: "viraram número" } },
    { rotulo: "Números Captados", valor: 31 },
  ];

  render(<FunilBarras titulo="Funil Instagram" etapas={etapas} conversaoTotal={null} />);

  const itens = within(screen.getByRole("list", { name: "Funil Instagram" })).getAllByRole("listitem");
  const segmentos = itens.map((item) => item.querySelector<HTMLElement>("[data-segmento]") as HTMLElement);
  expect(segmentos.map((s) => Number(s.dataset.larguraTopo))).toEqual([100, 78, 56]);
  expect(segmentos.map((s) => s.textContent)).toEqual(["Abordagens feitas0", "Respondidos0", "Números Captados31"]);
  expect(document.body.textContent).not.toContain("sem registro");
});

it("o texto da passagem fica entre o bloco da etapa e o da próxima", () => {
  const etapas: EtapaFunil[] = [
    { rotulo: "Enviadas", valor: 100, passagem: { taxa: 0.5, texto: "aceitaram" } },
    { rotulo: "Aceitas", valor: 50 },
  ];

  render(<FunilBarras titulo="Funil" etapas={etapas} conversaoTotal={0.5} />);

  const [primeiro, segundo] = within(screen.getByRole("list", { name: "Funil" })).getAllByRole("listitem");
  const linha = primeiro.querySelector<HTMLElement>("[data-linha-etapa]") as HTMLElement;
  const entre = linha.nextElementSibling as HTMLElement;

  expect(linha.querySelector("[data-segmento]")).not.toBeNull();
  expect(entre.hasAttribute("data-entre-etapas")).toBe(true);
  expect(entre.querySelector("[data-passagem]")?.textContent).toContain("↓ 50,0% aceitaram");
  expect(entre.nextElementSibling).toBeNull();
  expect(segundo.querySelector("[data-entre-etapas]")).toBeNull();
});

it("a nota vai no rodapé do card e a etapa dela ganha um asterisco", () => {
  const etapas: EtapaFunil[] = [
    { rotulo: "Enviadas", valor: 100, passagem: { taxa: 0.5, texto: "aceitaram" } },
    { rotulo: "Mensagem", valor: 50 },
  ];
  const lateral = { rotulo: "Follow de abordagem", texto: "756 (0,9 por abordagem)", aoLadoDe: 1 };

  render(<FunilBarras titulo="Funil" etapas={etapas} lateral={lateral} conversaoTotal={0.5} />);

  const lista = screen.getByRole("list", { name: "Funil" });
  const [primeiro, segundo] = within(lista).getAllByRole("listitem");
  expect(segundo.querySelector("[data-marca-nota]")?.textContent).toBe("*");
  expect(primeiro.querySelector("[data-marca-nota]")).toBeNull();
  expect(lista.textContent).not.toContain("Follow de abordagem");

  const rodape = document.querySelector("[data-nota-rodape]") as HTMLElement;
  expect(rodape.textContent).toBe("* Follow de abordagem: 756 (0,9 por abordagem)");
  // Rodapé = último elemento do card, depois do funil.
  expect(rodape.previousElementSibling).toBe(lista);
  expect(rodape.nextElementSibling).toBeNull();
});

it("sem nota, nem rodapé nem asterisco", () => {
  render(<FunilBarras titulo="Funil" etapas={[{ rotulo: "Abordagens", valor: 1 }]} conversaoTotal={null} />);
  expect(document.querySelector("[data-nota-rodape]")).toBeNull();
  expect(document.querySelector("[data-marca-nota]")).toBeNull();
});

it("mostra o conteúdo de `aoLado` em um card separado, à direita do funil", () => {
  render(
    <FunilBarras titulo="Funil" etapas={[{ rotulo: "Abordagens", valor: 1 }]} conversaoTotal={null} aoLado={<p>velocimetro</p>} />,
  );

  const cardFunil = screen.getByRole("list", { name: "Funil" }).closest(".glass-panel") as HTMLElement;
  expect(cardFunil.contains(screen.getByText("velocimetro"))).toBe(false);
  expect(cardFunil.nextElementSibling?.contains(screen.getByText("velocimetro"))).toBe(true);
  expect(cardFunil.parentElement?.className).toContain("lg:grid-cols-2");
});
