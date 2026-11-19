// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "../src/lib/fixtures/funil_linkedin.example.json";
import { buscarFunil } from "../src/lib/api";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import { FunilLinkedin } from "../src/paginas/FunilLinkedin";

vi.mock("../src/lib/api", () => ({
  buscarFunil: vi.fn(async () => fixture),
}));

beforeEach(() => vi.clearAllMocks());

afterEach(() => cleanup());

/** Card de KPI pelo rótulo (primeiro span do article). */
function cardDe(rotulo: string): HTMLElement {
  const card = screen.getAllByRole("article").find((a) => a.querySelector("span")?.textContent === rotulo);
  expect(card).toBeDefined();
  return card as HTMLElement;
}

/** Valor do card: o segundo span (o primeiro é o rótulo). */
function valorDe(rotulo: string): string | null {
  return cardDe(rotulo).querySelectorAll("span")[1].textContent;
}

it("mostra o funil e os cards somando todos os LinkedIns", async () => {
  render(
    <MemoryRouter initialEntries={["/funil-linkedin?granularidade=mes&periodo=2026-11"]}>
      <AtualizacaoProvider>
        <FunilLinkedin />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );

  const lista = await screen.findByRole("list", { name: "Funil LinkedIn" });
  expect(buscarFunil).toHaveBeenCalledWith("linkedin", { granularidade: "mes", periodo: "2026-11" });

  const medidor = screen.getByRole("meter", { name: "Números Captados" });
  expect(medidor.getAttribute("aria-valuenow")).toBe("89");
  expect(medidor.getAttribute("aria-valuemax")).toBe("154");
  expect(lista.closest(".glass-panel")?.nextElementSibling?.contains(medidor)).toBe(true);

  const etapas = within(lista).getAllByRole("listitem");
  expect(etapas).toHaveLength(5);
  expect(etapas[0].textContent).toContain("Conexões Enviadas");
  expect(etapas[0].textContent).toContain("1.621");
  expect(etapas[0].textContent).toContain("↓ 58,0% aceitaram");
  expect(etapas[0].textContent).not.toContain("não aceitaram");
  expect(etapas[1].textContent).toContain("Conexões Aceitas");
  expect(etapas[1].textContent).toContain("940");
  expect(etapas[1].textContent).toContain("↓ 89,4% abordados");
  expect(etapas[2].textContent).toContain("Mensagem de Abordagem");
  expect(etapas[2].textContent).toContain("840");
  expect(etapas[2].textContent).toContain("↓ 57,4% responderam");
  expect(etapas[2].querySelector("[data-marca-nota]")).not.toBeNull();
  expect(document.querySelector("[data-nota-rodape]")?.textContent).toBe("* Follow de abordagem: 713 (0,8 por abordagem)");
  expect(etapas[3].textContent).toContain("Respondidos");
  expect(etapas[3].textContent).toContain("482");
  expect(etapas[3].textContent).toContain("↓ 18,5% viraram número");
  expect(etapas[3].textContent).not.toContain("não viraram número");
  expect(etapas[3].textContent).toContain("maior perda");
  expect(etapas[4].textContent).toContain("Números Captados");
  expect(etapas[4].textContent).toContain("89");

  expect(screen.getByRole("group", { name: "Conversão total do funil" }).textContent).toContain("5,5%");
  expect(screen.getAllByRole("article").some((a) => a.querySelector("span")?.textContent === "Conversão total do funil")).toBe(false);
  expect(valorDe("Abordagens + Follows")).toBe("1.565");
  expect(valorDe("InMails enviados")).toBe("103");
  expect(valorDe("Follow-ups")).toBe("128");
});

/** Cells de uma linha da tabela, pelo nome da conta (ou TOTAL). */
function celulasDaLinha(tabela: HTMLElement, nome: string): string[] {
  const linha = within(tabela).getByRole("cell", { name: nome }).closest("tr") as HTMLElement;
  // Ignora o decorativo (foto/inicial com aria-hidden): fica o texto que o leitor de tela lê.
  return Array.from(linha.querySelectorAll("td"), (td) => {
    const copia = td.cloneNode(true) as HTMLElement;
    copia.querySelectorAll("[aria-hidden]").forEach((el) => el.remove());
    return copia.textContent ?? "";
  });
}

it("mostra tabela por LinkedIn, os mini-funis e o gráfico por conta no lugar do Dashboard", async () => {
  render(
    <MemoryRouter initialEntries={["/funil-linkedin?granularidade=mes&periodo=2026-11&conta=Alex"]}>
      <AtualizacaoProvider>
        <FunilLinkedin />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );

  const tabela = await screen.findByRole("table", { name: "Por LinkedIn" });
  expect(within(tabela).getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
    "LinkedIn",
    "Conexões Enviadas",
    "% Aceitação",
    "Conexões Aceitas",
    "% Abordados",
    "Mensagem de Abordagem",
    "% Resposta",
    "Respondidos",
    "% Conversão em número",
    "Números Captados",
    "Conversão total",
  ]);
  expect(within(tabela).getAllByRole("row")).toHaveLength(7);

  expect(celulasDaLinha(tabela, "Jacob")).toEqual([
    "Jacob",
    "381",
    "66,4%",
    "253",
    "95,7%",
    "242",
    "68,2%",
    "165",
    "11,5%",
    "19",
    "5,0%",
  ]);
  const fotoJacob = within(tabela).getByRole("cell", { name: "Jacob" }).querySelector("img");
  expect(fotoJacob?.getAttribute("src")).toContain("/fotos_dash/jacob.png");
  expect(within(tabela).getByRole("cell", { name: "Alex" }).closest("tr")?.getAttribute("aria-current")).toBe("true");
  expect(within(tabela).getByRole("cell", { name: "Jacob" }).closest("tr")?.getAttribute("aria-current")).toBeNull();

  const lista = screen.getByRole("list", { name: "Funil LinkedIn" });
  const etapas = within(lista).getAllByRole("listitem");
  expect(etapas[0].textContent).toContain("Conexões Enviadas");
  expect(etapas[0].textContent).toContain("165");

  expect(within(screen.getByRole("region", { name: "Funil por LinkedIn" })).getByRole("button", { name: /Alex/ }).getAttribute("aria-pressed")).toBe("true");

  expect(screen.queryByRole("heading", { name: /Dashboard/ })).toBeNull();
  const grafico = screen.getByRole("figure", { name: "Evolução por conta" });
  expect(grafico.querySelectorAll("[data-linha]")).toHaveLength(5);
  const seletor = screen.getByRole("combobox", { name: "Métrica" });
  expect(within(seletor).getAllByRole("option").map((o) => o.textContent)).toEqual([
    "Conexões Enviadas",
    "Conexões Aceitas",
    "Mensagem de Abordagem",
    "Respondidos",
    "Números Captados",
    "Abordagens",
    "Follow de abordagem",
    "InMails Enviados",
    "Follow-ups",
  ]);
});

it("clicar num mini-funil filtra o funil pelo LinkedIn escolhido", async () => {
  render(
    <MemoryRouter initialEntries={["/funil-linkedin?granularidade=mes&periodo=2026-11"]}>
      <AtualizacaoProvider>
        <FunilLinkedin />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );

  await screen.findByRole("list", { name: "Funil LinkedIn" });
  const regiao = screen.getByRole("region", { name: "Funil por LinkedIn" });
  expect(within(regiao).getAllByRole("button")).toHaveLength(5);

  fireEvent.click(within(regiao).getByRole("button", { name: /Leticia/ }));
  const primeiroItem = () => within(screen.getByRole("list", { name: "Funil LinkedIn" })).getAllByRole("listitem")[0];
  expect(primeiroItem().textContent).toContain("395");
  expect(within(regiao).getByRole("button", { name: /Leticia/ }).getAttribute("aria-pressed")).toBe("true");

  fireEvent.click(within(regiao).getByRole("button", { name: /Leticia/ }));
  expect(primeiroItem().textContent).toContain("1.621");

  expect(buscarFunil).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("figure", { name: "Volume por LinkedIn" })).toBeNull();
  expect(screen.queryByRole("figure", { name: "Taxa de conversão por LinkedIn" })).toBeNull();
});

it("sem título da página", async () => {
  render(
    <MemoryRouter initialEntries={["/funil-linkedin?granularidade=mes&periodo=2026-11"]}>
      <AtualizacaoProvider>
        <FunilLinkedin />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );

  await screen.findByRole("list", { name: "Funil LinkedIn" });
  expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
});
