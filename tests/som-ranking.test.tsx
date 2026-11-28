// @vitest-environment jsdom
//
// Som dos rankings (SDR e Seller): toca uma vez por item cujo valor subiu entre
// dois refreshes. O áudio é mockado (jsdom não toca mídia) — a asserção é sobre
// quantas vezes o `tocar` foi chamado.
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SomProvider, useSomDeRanking, type ItemParaSom } from "../src/lib/som";

vi.mock("../src/lib/som-audio", () => ({
  plin: vi.fn(),
  liberar: vi.fn(async () => true),
  estaLiberado: vi.fn(() => true),
  tocarArquivo: vi.fn(),
}));

const tocar = vi.fn();

function Harness({ itens, chave }: { itens: ItemParaSom[] | undefined; chave: string }) {
  useSomDeRanking(itens, chave, tocar);
  return null;
}

function arvore(itens: ItemParaSom[] | undefined, chave = "e1") {
  return (
    <SomProvider>
      <Harness itens={itens} chave={chave} />
    </SomProvider>
  );
}

/** Espera real o suficiente pro som imediato e pro atrasado (~450ms) — só nas asserções negativas. */
function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  localStorage.clear();
  tocar.mockClear();
});

afterEach(() => cleanup());

describe("som do ranking", () => {
  it("valor de um item sobe → toca uma vez", async () => {
    const { rerender } = render(arvore([{ id: "9", valor: 3 }]));

    rerender(arvore([{ id: "9", valor: 4 }]));

    await waitFor(() => expect(tocar).toHaveBeenCalledTimes(1));
  });

  it("dois itens sobem no mesmo refresh → toca duas vezes", async () => {
    const { rerender } = render(
      arvore([
        { id: "9", valor: 3 },
        { id: "4", valor: 2 },
      ]),
    );

    rerender(
      arvore([
        { id: "9", valor: 4 },
        { id: "4", valor: 5 },
      ]),
    );

    await waitFor(() => expect(tocar).toHaveBeenCalledTimes(2), { timeout: 2000 });
  });

  it("primeira carga não toca", async () => {
    render(arvore([{ id: "9", valor: 3 }]));

    await aguardar(600);
    expect(tocar).toHaveBeenCalledTimes(0);
  });

  it("chave muda → não toca", async () => {
    const { rerender } = render(arvore([{ id: "9", valor: 3 }], "e1"));

    rerender(arvore([{ id: "9", valor: 10 }], "e2"));

    await aguardar(600);
    expect(tocar).toHaveBeenCalledTimes(0);
  });

  it("valor cai → não toca", async () => {
    const { rerender } = render(arvore([{ id: "9", valor: 5 }]));

    rerender(arvore([{ id: "9", valor: 3 }]));

    await aguardar(600);
    expect(tocar).toHaveBeenCalledTimes(0);
  });

  it("item novo na lista → não toca", async () => {
    const { rerender } = render(arvore([{ id: "9", valor: 3 }]));

    rerender(
      arvore([
        { id: "9", valor: 3 },
        { id: "4", valor: 7 },
      ]),
    );

    await aguardar(600);
    expect(tocar).toHaveBeenCalledTimes(0);
  });

  it("som desligado → não toca", async () => {
    localStorage.setItem("ak_dash_som", "false");

    const { rerender } = render(arvore([{ id: "9", valor: 3 }]));

    rerender(arvore([{ id: "9", valor: 4 }]));

    await aguardar(600);
    expect(tocar).toHaveBeenCalledTimes(0);
  });
});
