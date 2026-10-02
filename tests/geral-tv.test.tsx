// @vitest-environment jsdom
//
// Geral na TV: as duas faixas de card dividem a altura pelo conteúdo, não em
// partes iguais. A faixa escura pede ~181px e a clara ~204px a 1920×1080
// (medido no Chrome com as fixtures); meio a meio, cada uma ganhava 192px e a
// clara cortava a legenda de ritmo. jsdom não faz layout: o teste trava a regra.
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import geral from "../src/lib/fixtures/geral.example.json";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import { SomProvider } from "../src/lib/som";
import { Geral } from "../src/paginas/Geral";

vi.mock("../src/lib/api", () => ({ buscarGeral: async () => geral }));

afterEach(() => cleanup());

describe("Geral — faixas de card na TV", () => {
  it("as duas faixas de card crescem a partir da altura do próprio conteúdo", async () => {
    const { container } = render(
      <MemoryRouter>
        <AtualizacaoProvider>
          <SomProvider>
            <Geral />
          </SomProvider>
        </AtualizacaoProvider>
      </MemoryRouter>,
    );
    await screen.findByText("Ranking SDR");

    const [escura, clara] = [...container.querySelectorAll(":scope > div > section")];
    for (const faixa of [escura, clara]) {
      expect(faixa.className).toContain("flex-auto");
      expect(faixa.className).not.toMatch(/(^|\s)flex-1(\s|$)/);
    }
  });
});
