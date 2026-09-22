// @vitest-environment jsdom
//
// A primeira carga (e toda troca de página, que remonta a página do zero)
// mostrava um "Carregando…" solto, trocando o dashboard inteiro por uma linha
// de texto. Agora mostra a própria grade vazia, piscando. Este teste trava os
// dois lados: o texto não volta, e o esqueleto tem que estar no lugar dele.
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import { SomProvider } from "../src/lib/som";
import { Geral } from "../src/paginas/Geral";
import type { RespostaGeral } from "../src/lib/tipos-api";

const DADO: RespostaGeral = {
  periodo: { granularidade: "mes", inicio: "2026-09-01", fim: "2026-09-21" },
  dias_uteis: { decorridos: 15, total: 22 },
  cards: [
    { metrica: "faturamento", nome_exibicao: "Faturamento", escuro: true, realizado: 500000, meta: null, pct: null, pct_ritmo: null },
  ],
  eventos: [],
  pessoas: [],
  avisos: [],
};

// Nunca resolve enquanto o teste não mandar — é assim que a fase de
// carregamento fica observável.
let liberar: (dado: RespostaGeral) => void = () => {};

vi.mock("../src/lib/api", () => ({
  buscarGeral: vi.fn(() => new Promise<RespostaGeral>((resolve) => (liberar = resolve))),
}));

function montar() {
  return render(
    <MemoryRouter>
      <AtualizacaoProvider>
        <SomProvider>
          <Geral />
        </SomProvider>
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("estado de carregamento da Geral", () => {
  it("mostra a grade vazia piscando, sem texto de carregamento, e some quando o dado chega", async () => {
    const { container } = montar();

    expect(screen.queryByText(/carregando/i)).toBeNull();
    expect(container.querySelectorAll(".card-esqueleto").length).toBeGreaterThan(0);

    liberar(DADO);

    await waitFor(() => expect(screen.getByText("Faturamento")).toBeTruthy());
    expect(container.querySelectorAll(".card-esqueleto").length).toBe(0);
  });
});
