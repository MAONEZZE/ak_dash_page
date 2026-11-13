// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
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

  const etapas = within(lista).getAllByRole("listitem");
  expect(etapas).toHaveLength(5);
  expect(etapas[0].textContent).toContain("Conexões Enviadas");
  expect(etapas[0].textContent).toContain("1.621");
  expect(etapas[0].textContent).toContain("↓ 58,0% aceitaram");
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
  expect(etapas[4].textContent).toContain("Números Captados");
  expect(etapas[4].textContent).toContain("89");

  expect(valorDe("Conversão total do funil")).toBe("5,5%");
  expect(valorDe("Abordagens + Follows")).toBe("1.565");
  expect(valorDe("InMails enviados")).toBe("103");
  expect(valorDe("Follow-ups")).toBe("128");
});
