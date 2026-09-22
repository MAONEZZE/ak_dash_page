// @vitest-environment jsdom
//
// Clicar na pill de período (Dia/Semana/Mês/Ano) fazia a tela piscar
// "periodo inválido para granularidade 'mes': esperado AAAA-MM".
//
// A granularidade vinha da querystring (muda no mesmo render do clique) e o
// período vinha de um `useState` que só um efeito atualizava — então existia um
// render com o par errado (granularidade nova + período da granularidade
// velha), e é nesse render que a página dispara a busca. O BFF recusava o par
// com 400 e o erro tomava a tela no lugar dos dados que já estavam lá.
//
// Este teste trava os dois lados: nenhuma busca sai com par inconsistente, e
// dado bom na tela não é trocado por texto de erro.
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import { useDefinirGranularidade } from "../src/lib/periodo";
import { SomProvider } from "../src/lib/som";
import { Geral } from "../src/paginas/Geral";
import type { Granularidade, ParametrosGeral, RespostaGeral } from "../src/lib/tipos-api";

const FORMATO: Record<Granularidade, RegExp> = {
  dia: /^\d{4}-\d{2}-\d{2}$/,
  semana: /^\d{4}-W\d{2}$/,
  mes: /^\d{4}-\d{2}$/,
  ano: /^\d{4}$/,
};

function respostaPara(granularidade: Granularidade): RespostaGeral {
  return {
    periodo: { granularidade, inicio: "2026-09-01", fim: "2026-09-22" },
    dias_uteis: { decorridos: 15, total: 22 },
    cards: [
      { metrica: "faturamento", nome_exibicao: "Faturamento", escuro: true, realizado: 500000, meta: null, pct: null, pct_ritmo: null },
    ],
    eventos: [],
    pessoas: [],
    avisos: [],
  };
}

const chamadas: Required<ParametrosGeral>[] = [];

/** Liga a falha de rede no meio do teste — usado pelo caso do refresh que falha. */
let falhar = false;

// Mesma recusa do BFF (`app/periodo.py::resolver_periodo`) — o par errado tem
// que estourar aqui também, senão o teste passaria sem cobrir nada.
vi.mock("../src/lib/api", () => ({
  buscarGeral: vi.fn(async ({ granularidade, periodo }: Required<ParametrosGeral>) => {
    chamadas.push({ granularidade, periodo });
    if (falhar) throw new Error("Failed to fetch");
    if (!FORMATO[granularidade].test(periodo)) {
      throw new Error(`periodo inválido para granularidade '${granularidade}'`);
    }
    return respostaPara(granularidade);
  }),
}));

/** Stand-in da pill do header, que vive no App.tsx, fora da árvore da página. */
function PillPeriodo() {
  const definir = useDefinirGranularidade();
  return (
    <>
      {(["dia", "semana", "mes", "ano"] as const).map((g) => (
        <button key={g} type="button" onClick={() => definir(g)}>
          {g}
        </button>
      ))}
    </>
  );
}

function montar() {
  return render(
    <MemoryRouter initialEntries={["/?granularidade=dia"]}>
      <AtualizacaoProvider>
        <SomProvider>
          <PillPeriodo />
          <Geral />
        </SomProvider>
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  chamadas.length = 0;
  falhar = false;
  cleanup();
});

describe("troca de granularidade", () => {
  it("nunca busca com granularidade e período de formatos diferentes", async () => {
    montar();
    await waitFor(() => expect(chamadas.length).toBeGreaterThan(0));

    for (const g of ["mes", "semana", "ano", "dia"] as const) {
      screen.getByText(g).click();
      await waitFor(() => expect(chamadas.at(-1)?.granularidade).toBe(g));
    }

    const inconsistentes = chamadas.filter((c) => !FORMATO[c.granularidade].test(c.periodo));
    expect(inconsistentes).toEqual([]);
  });

  it("busca que falha não troca os dados da tela por texto de erro", async () => {
    montar();
    await waitFor(() => expect(screen.getByText("Faturamento")).toBeTruthy());

    falhar = true;
    screen.getByText("mes").click();
    await waitFor(() => expect(chamadas.length).toBeGreaterThan(1));

    // Os últimos dados bons continuam na tela — a atualização só acontece
    // quando há dado novo pra mostrar.
    await waitFor(() => expect(screen.getByText("Faturamento")).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
