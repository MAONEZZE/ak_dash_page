// @vitest-environment jsdom
//
// Som dos cards de Inscritos/Aprovados: toca `inscrito.wav` / `aprovado.wav`
// quando as contagens de um evento sobem entre dois refreshes. O áudio é
// mockado (jsdom não toca mídia) — a asserção é sobre qual arquivo tocou, e
// quantas vezes.
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SomProvider, useSomDeEvento, type EventoParaSom } from "../src/lib/som";

const tocados: string[] = [];

vi.mock("../src/lib/som-audio", () => ({
  plin: vi.fn(),
  liberar: vi.fn(async () => true),
  estaLiberado: vi.fn(() => true),
  tocarArquivo: vi.fn((nome: string) => tocados.push(nome)),
}));

function evento(id: string, inscritos: number, aprovados: number): EventoParaSom {
  return { id, inscritos, aprovados };
}

function Harness({ eventos }: { eventos: EventoParaSom[] }) {
  useSomDeEvento(eventos);
  return null;
}

function arvore(eventos: EventoParaSom[]) {
  return (
    <SomProvider>
      <Harness eventos={eventos} />
    </SomProvider>
  );
}

/** Espera real o suficiente pro som imediato e pro atrasado (~450ms) — só nas asserções negativas. */
function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  localStorage.clear();
  tocados.length = 0;
});

afterEach(() => cleanup());

describe("som de Inscritos/Aprovados", () => {
  it("inscritos sobem → toca inscrito, uma vez", async () => {
    const { rerender } = render(arvore([evento("e1", 10, 4)]));
    expect(tocados).toEqual([]);

    rerender(arvore([evento("e1", 11, 4)]));

    await waitFor(() => expect(tocados).toEqual(["inscrito"]));
  });

  it("aprovados sobem → toca aprovado", async () => {
    const { rerender } = render(arvore([evento("e1", 10, 4)]));

    rerender(arvore([evento("e1", 10, 5)]));

    await waitFor(() => expect(tocados).toEqual(["aprovado"]));
  });

  it("os dois sobem no mesmo refresh → toca os dois, um de cada", async () => {
    const { rerender } = render(arvore([evento("e1", 10, 4)]));

    rerender(arvore([evento("e1", 12, 6)]));

    await waitFor(() => expect(tocados.sort()).toEqual(["aprovado", "inscrito"]), { timeout: 2000 });
  });

  it("dois eventos ganham inscritos no mesmo refresh → um som só", async () => {
    const { rerender } = render(arvore([evento("e1", 10, 4), evento("e2", 7, 2)]));

    rerender(arvore([evento("e1", 11, 4), evento("e2", 9, 2)]));

    await aguardar(600);
    expect(tocados).toEqual(["inscrito"]);
  });

  it("primeira carga não toca", async () => {
    render(arvore([evento("e1", 10, 4)]));

    await aguardar(600);
    expect(tocados).toEqual([]);
  });

  it("evento novo entrando na lista não toca", async () => {
    const { rerender } = render(arvore([evento("e1", 10, 4)]));

    rerender(arvore([evento("e1", 10, 4), evento("e2", 30, 20)]));

    await aguardar(600);
    expect(tocados).toEqual([]);
  });

  it("queda nas contagens não toca", async () => {
    const { rerender } = render(arvore([evento("e1", 10, 4)]));

    rerender(arvore([evento("e1", 8, 3)]));

    await aguardar(600);
    expect(tocados).toEqual([]);
  });

  it("som desligado no localStorage → nenhuma chamada ao áudio", async () => {
    localStorage.setItem("ak_dash_som", "false");

    const { rerender } = render(arvore([evento("e1", 10, 4)]));

    rerender(arvore([evento("e1", 15, 9)]));

    await aguardar(600);
    expect(tocados).toEqual([]);
  });
});
