// @vitest-environment jsdom
//
// O dash vive numa TV, com a aba aberta por dias. Estes testes travam o que
// fazia ele "ficar parado no 17/09": o período pedido ao BFF tem que ser
// sempre o de HOJE, tanto na virada da meia-noite com a aba aberta quanto
// numa URL antiga que tenha um período absoluto gravado — em dia/semana/ano.
// Em MÊS a regra se inverte (ver `useNavegarMes` em src/lib/periodo.ts): a
// Financeiro navega mês passado pela querystring, então ali o período da URL
// é respeitado.
import { act, cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFiltrosAtuais } from "../src/lib/periodo";

function Sonda() {
  const { granularidade, periodo } = useFiltrosAtuais();
  return <span data-testid="filtro">{`${granularidade}:${periodo}`}</span>;
}

function montar(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Sonda />
    </MemoryRouter>,
  );
}

function filtro(): string {
  return screen.getByTestId("filtro").textContent ?? "";
}

/** Anda com o relógio E com os timers juntos — é a checagem periódica que reconfere o dia. */
async function avancar(ms: number) {
  await act(async () => {
    vi.setSystemTime(new Date(Date.now() + ms));
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("período corrente", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("a virada da meia-noite muda o dia pedido, sem recarregar a página", async () => {
    vi.setSystemTime(new Date(2026, 8, 17, 23, 58));
    montar("/?granularidade=dia");
    expect(filtro()).toBe("dia:2026-09-17");

    await avancar(5 * 60_000); // 00:03 do dia seguinte
    expect(filtro()).toBe("dia:2026-09-18");
  });

  it("a virada de mês também é acompanhada", async () => {
    vi.setSystemTime(new Date(2026, 8, 30, 23, 58));
    montar("/?granularidade=mes");
    expect(filtro()).toBe("mes:2026-09");

    await avancar(5 * 60_000);
    expect(filtro()).toBe("mes:2026-10");
  });

  it("período absoluto sobrando numa URL antiga é ignorado em dia", () => {
    // Era exatamente essa URL que a TV reabria todo dia: a pill de período
    // gravava `?periodo=` no clique e a página nunca mais saía daquele dia.
    vi.setSystemTime(new Date(2026, 8, 19, 10, 0));
    montar("/?granularidade=dia&periodo=2026-09-17");
    expect(filtro()).toBe("dia:2026-09-19");
  });

  it("período absoluto sobrando numa URL antiga é ignorado em semana", () => {
    vi.setSystemTime(new Date(2026, 8, 19, 10, 0));
    montar("/?granularidade=semana&periodo=2026-W30");
    expect(filtro()).toBe("semana:2026-W38");
  });

  it("período absoluto sobrando numa URL antiga é ignorado em ano", () => {
    vi.setSystemTime(new Date(2026, 8, 19, 10, 0));
    montar("/?granularidade=ano&periodo=2020");
    expect(filtro()).toBe("ano:2026");
  });

  it("em mês, o período da URL é RESPEITADO — é a navegação de mês passado da Financeiro", () => {
    vi.setSystemTime(new Date(2026, 8, 19, 10, 0));
    montar("/?granularidade=mes&periodo=2026-05");
    expect(filtro()).toBe("mes:2026-05");
  });

  it("em mês sem período na URL, cai no mês corrente", () => {
    vi.setSystemTime(new Date(2026, 8, 19, 10, 0));
    montar("/?granularidade=mes");
    expect(filtro()).toBe("mes:2026-09");
  });

  it("sem granularidade na URL, o padrão é o mês corrente", () => {
    vi.setSystemTime(new Date(2026, 8, 19, 10, 0));
    montar("/");
    expect(filtro()).toBe("mes:2026-09");
  });
});
