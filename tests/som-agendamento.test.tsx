// @vitest-environment jsdom
//
// Regra de disparo do plin (docs/plans/som-agendamento-nathan-jennifer.md):
// só toca quando ligações/reuniões agendadas do Nathan ou da Jennifer sobem
// entre dois refreshes, no período corrente, com o som ligado. O áudio é
// mockado (jsdom não tem AudioContext) — a asserção é sobre qual perfil
// tocou, e quantas vezes.
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paraPeriodo } from "../src/lib/periodo";
import { SomProvider, useSomDeAumento, type PessoaParaSom } from "../src/lib/som";
import type { Granularidade } from "../src/lib/tipos-api";

const tocados: string[] = [];

vi.mock("../src/lib/som-audio", () => ({
  plin: vi.fn((perfil: string) => tocados.push(perfil)),
  liberar: vi.fn(async () => true),
  estaLiberado: vi.fn(() => false),
}));

const PERIODO_ATUAL = paraPeriodo("mes", new Date());
// Qualquer mês bem no passado nunca é o corrente, sem depender da data do teste.
const MES_PASSADO = "2020-01";

const NATHAN = "9";
const JENNIFER = "4";
const JONATHAN = "99"; // SDR não vigiado

function pessoa(id: string, ligacoesAgendadas: number): PessoaParaSom {
  return {
    id_user: id,
    metricas: [
      { metrica: "ligacoes_agendadas", realizado: ligacoesAgendadas },
      { metrica: "reunioes_agendadas", realizado: 0 },
    ],
  };
}

function Harness({
  pessoas,
  granularidade = "mes",
  periodo = PERIODO_ATUAL,
}: {
  pessoas: PessoaParaSom[];
  granularidade?: Granularidade;
  periodo?: string;
}) {
  useSomDeAumento({ pessoas, granularidade, periodo });
  return null;
}

function arvore(pessoas: PessoaParaSom[], props: Partial<{ granularidade: Granularidade; periodo: string }> = {}) {
  return (
    <SomProvider>
      <Harness pessoas={pessoas} {...props} />
    </SomProvider>
  );
}

/** Espera real o suficiente pra cobrir o plin imediato e o atrasado (~450ms) — usado só nas asserções negativas. */
function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  localStorage.clear();
  tocados.length = 0;
});

afterEach(() => cleanup());

describe("som de agendamento — Nathan e Jennifer", () => {
  it("ligação agendada do Nathan sobe entre dois refreshes → toca nathan, uma vez", async () => {
    const { rerender } = render(arvore([pessoa(NATHAN, 3)]));
    expect(tocados).toEqual([]);

    rerender(arvore([pessoa(NATHAN, 4)]));

    await waitFor(() => expect(tocados).toEqual(["nathan"]));
  });

  it("primeira carga não toca", async () => {
    render(arvore([pessoa(NATHAN, 3), pessoa(JENNIFER, 2)]));

    await aguardar(600);
    expect(tocados).toEqual([]);
  });

  it("troca de granularidade/período não toca, mesmo com número maior", async () => {
    const periodoSemanaAtual = paraPeriodo("semana", new Date());
    const { rerender } = render(arvore([pessoa(NATHAN, 3)], { granularidade: "mes", periodo: PERIODO_ATUAL }));
    expect(tocados).toEqual([]);

    rerender(arvore([pessoa(NATHAN, 30)], { granularidade: "semana", periodo: periodoSemanaAtual }));

    await aguardar(600);
    expect(tocados).toEqual([]);
  });

  it("queda no valor não toca", async () => {
    const { rerender } = render(arvore([pessoa(NATHAN, 5)]));
    expect(tocados).toEqual([]);

    rerender(arvore([pessoa(NATHAN, 3)]));

    await aguardar(600);
    expect(tocados).toEqual([]);
  });

  it("aumento do Jonathan (SDR não vigiado) não toca", async () => {
    const { rerender } = render(arvore([pessoa(JONATHAN, 3)]));
    expect(tocados).toEqual([]);

    rerender(arvore([pessoa(JONATHAN, 10)]));

    await aguardar(600);
    expect(tocados).toEqual([]);
  });

  it("Nathan e Jennifer sobem no mesmo refresh → dois sons, um de cada perfil", async () => {
    const { rerender } = render(arvore([pessoa(NATHAN, 3), pessoa(JENNIFER, 2)]));
    expect(tocados).toEqual([]);

    rerender(arvore([pessoa(NATHAN, 4), pessoa(JENNIFER, 3)]));

    await waitFor(() => expect(tocados.sort()).toEqual(["jennifer", "nathan"]), { timeout: 2000 });
  });

  it("mês passado não toca", async () => {
    const { rerender } = render(arvore([pessoa(NATHAN, 3)], { granularidade: "mes", periodo: MES_PASSADO }));
    expect(tocados).toEqual([]);

    rerender(arvore([pessoa(NATHAN, 4)], { granularidade: "mes", periodo: MES_PASSADO }));

    await aguardar(600);
    expect(tocados).toEqual([]);
  });

  it("som desligado no localStorage → nenhuma chamada ao áudio", async () => {
    localStorage.setItem("ak_dash_som", "false");

    const { rerender } = render(arvore([pessoa(NATHAN, 3)]));
    expect(tocados).toEqual([]);

    rerender(arvore([pessoa(NATHAN, 4)]));

    await aguardar(600);
    expect(tocados).toEqual([]);
  });
});
