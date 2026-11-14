// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import fixture from "../src/lib/fixtures/funil_linkedin.example.json";
import { buscarFunil } from "../src/lib/api";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import { FunilLinkedin } from "../src/paginas/FunilLinkedin";
import type { MetricaTime, RespostaFunil } from "../src/lib/tipos-api";

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

  const etapas = within(lista).getAllByRole("listitem");
  expect(etapas).toHaveLength(5);
  expect(etapas[0].textContent).toContain("Conexões Enviadas");
  expect(etapas[0].textContent).toContain("1.621");
  expect(etapas[0].textContent).toContain("↓ 58,0% aceitaram");
  expect(etapas[0].textContent).toContain("−681 não aceitaram");
  expect(etapas[1].textContent).toContain("Conexões Aceitas");
  expect(etapas[1].textContent).toContain("940");
  expect(etapas[1].textContent).toContain("↓ 89,4% abordados");
  expect(etapas[2].textContent).toContain("Mensagem de Abordagem");
  expect(etapas[2].textContent).toContain("840");
  expect(etapas[2].textContent).toContain("↓ 57,4% responderam");
  expect(etapas[2].textContent).toContain("Follow de abordagem");
  expect(etapas[2].textContent).toContain("713 (0,8 por abordagem)");
  expect(etapas[3].textContent).toContain("Respondidos");
  expect(etapas[3].textContent).toContain("482");
  expect(etapas[3].textContent).toContain("↓ 18,5% viraram número");
  expect(etapas[3].textContent).toContain("−393 não viraram número");
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
  return Array.from(linha.querySelectorAll("td"), (td) => td.textContent ?? "");
}

it("mostra tabela por LinkedIn, os mini-funis e o bloco Dashboard da Duda", async () => {
  const fups: MetricaTime = {
    metrica: "fups",
    nome_exibicao: "Fups",
    meta_periodo: 750,
    realizado: 20,
    pct_atingimento: 2.7,
    falta_folga: { tipo: "falta", valor: 730 },
    horas_restantes: null,
    media_necessaria: null,
    previsao: null,
  };
  vi.mocked(buscarFunil).mockResolvedValueOnce({ ...fixture, dashboard: { ...fixture.dashboard, diario: [fups] } } as RespostaFunil);

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
    "Abordagens",
    "InMails Enviados",
    "Follow-ups",
    "Follow de abordagem",
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
    "572",
    "103",
    "19",
    "353",
  ]);
  expect(within(tabela).getByRole("cell", { name: "Alex" }).closest("tr")?.getAttribute("aria-current")).toBe("true");
  expect(within(tabela).getByRole("cell", { name: "Jacob" }).closest("tr")?.getAttribute("aria-current")).toBeNull();

  const lista = screen.getByRole("list", { name: "Funil LinkedIn" });
  const etapas = within(lista).getAllByRole("listitem");
  expect(etapas[0].textContent).toContain("Conexões Enviadas");
  expect(etapas[0].textContent).toContain("165");

  expect(within(screen.getByRole("region", { name: "Funil por LinkedIn" })).getByRole("button", { name: /Alex/ }).getAttribute("aria-pressed")).toBe("true");

  expect(screen.getByRole("heading", { name: "Dashboard · Duda" })).toBeTruthy();
  expect(within(screen.getByRole("table", { name: "Diário" })).getByText("750")).toBeTruthy();
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
