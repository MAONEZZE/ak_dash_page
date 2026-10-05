// @vitest-environment jsdom
//
// Página Time: um card por pessoa com todas as métricas do cargo (sem as do
// Dripify), cada uma com barra de ritmo, "Esperado hoje" e chip de status; um
// anel "X/Y metas no ritmo" no topo, cards ordenados por essa proporção e quem
// não tem meta nenhuma no período fica fora da grade, num aviso único.
//
// Saíram de propósito os testes da regra anterior (barra até 125% da meta com
// traço em 80%, preenchimento vermelho/amarelo/verde por faixa de realizado e
// meta 0 como "meta cadastrada"): a barra agora é a ProgressBar do ritmo
// (marcador = esperado hoje, cor = status do ritmo) e meta 0 vale "sem meta".
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtualizacaoProvider, useAtualizacao } from "../src/lib/atualizacao";
import { Time } from "../src/paginas/Time";
import type { Metrica, PessoaComercial, RespostaComercial } from "../src/lib/tipos-api";

// Dia útil 10 de 22: com meta 10, o esperado hoje é ~4,5.
// No ritmo ≥ 4,55 · atrás ≥ 3,64 · muito atrás abaixo disso.
function metrica(chave: string, nome: string, realizado: number, meta: number | null = 10): Metrica {
  return {
    metrica: chave,
    nome_exibicao: nome,
    meta_periodo: meta,
    realizado,
    status: meta === null ? "sem_meta" : realizado >= meta ? "atingido" : "abaixo_da_meta",
    dias_com_lacuna: 0,
  };
}

function pessoa(id: string, nome: string, metricas: Metrica[], email = `${nome.toLowerCase()}@x.com`): PessoaComercial {
  return {
    id_user: id,
    email,
    nome,
    imagem_url: `https://exemplo/${id}.png`,
    metas_atingidas: { atingidas: 0, total: metricas.length },
    metricas,
    pontuacao_total: 0,
    posicao: 1,
    contas_origem: [],
  };
}

function resposta(pessoas: PessoaComercial[]): RespostaComercial {
  return {
    periodo: { granularidade: "mes", inicio: "2026-09-01", fim: "2026-09-30" },
    dias_uteis: { decorridos: 10, total: 22 },
    periodo_parcial: true,
    avisos: [],
    pessoas,
    serie_diaria: [],
  };
}

vi.mock("../src/lib/api", () => ({
  // Nathan: 3 de 5 metas no ritmo (0,6). Jonathan SDR: 1/1. Elisa: nenhuma meta.
  buscarComercialSdr: vi.fn(async () =>
    resposta([
      pessoa("9", "Nathan", [
        metrica("conexoes_enviadas", "Conexões Enviadas", 40),
        metrica("inscricoes_realizadas", "Inscrições Realizadas", 1),
        metrica("fups", "Follow-ups", 12),
        metrica("reunioes_agendadas", "Reuniões Agendadas", 3, null),
        metrica("ligacoes_realizadas", "Ligações Realizadas", 5),
        metrica("indicacoes", "Indicações", 2),
        metrica("numeros_captados", "Números Captados", 7),
      ]),
      pessoa("2", "Jonathan", [metrica("ligacoes_realizadas", "Ligações Realizadas", 6)]),
      pessoa("3", "Elisa", [metrica("fups", "Follow-ups", 4, null), metrica("indicacoes", "Indicações", 1, null)]),
    ]),
  ),
  // Carla: 4 de 6 no ritmo (0,67). Davi: só meta 0 → sem meta. Jonathan Closer: 0/1.
  buscarComercialCloser: vi.fn(async () =>
    resposta([
      pessoa(
        "7",
        "Carla",
        [
          metrica("inscricoes_realizadas", "Inscrições Realizadas", 5),
          metrica("indicacoes", "Indicações", 1),
          metrica("ligacoes_agendadas", "Ligações Agendadas", 7),
          metrica("reunioes_realizadas", "Reuniões Realizadas", 30),
          metrica("reunioes_agendadas", "Reuniões Agendadas", 4),
          metrica("ligacoes_realizadas", "Ligações Realizadas", 8),
        ],
        "Carla@X.com",
      ),
      pessoa("8", "Davi", [
        { ...metrica("ligacoes_realizadas", "Ligações Realizadas", 0, 0), status: "sem_preenchimento" },
        // numeric do Postgres serializado como string
        { ...metrica("reunioes_realizadas", "Reuniões Realizadas", 1, 0), meta_periodo: "0.00" as unknown as number, status: "sem_meta" },
      ]),
      // Mesma pessoa do SDR "2", outra conta: id diferente, mesmo email.
      { ...pessoa("10", "Jonathan", [metrica("reunioes_realizadas", "Reuniões Realizadas", 1)]), imagem_url: null },
    ]),
  ),
}));

function EspiaDiasUteis() {
  const { diasUteis } = useAtualizacao().valor;
  return <span data-testid="dias-uteis">{diasUteis ? `${diasUteis.decorridos}/${diasUteis.total}` : "-"}</span>;
}

function montar(url = "/time") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AtualizacaoProvider>
        <EspiaDiasUteis />
        <Time />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

function card(email: string): HTMLElement {
  const el = document.getElementById(`pessoa-${email}`);
  if (!el) throw new Error(`card de ${email} não renderizado`);
  return el;
}

function ordemDosCards(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[id^='pessoa-']")).map((el) => el.id.replace("pessoa-", ""));
}

function rotulos(el: HTMLElement): string[] {
  return within(el)
    .getAllByRole("group")
    .filter((g) => g.getAttribute("aria-label") !== "Cargo")
    .map((g) => g.getAttribute("aria-label") ?? "");
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockReset();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("página Time — métricas do card", () => {
  it("SDR mostra as 6 métricas do cargo, sem as do Dripify, na ordem fixa", async () => {
    montar();
    await screen.findByText("Nathan");
    expect(rotulos(card("nathan@x.com"))).toEqual([
      "Follow-ups",
      "Números Captados",
      "Inscrições Realizadas",
      "Ligações Realizadas",
      "Indicações",
      "Reuniões Agendadas",
    ]);
  });

  it("closer mostra as 6 métricas do cargo, na ordem fixa", async () => {
    montar();
    await screen.findByText("Carla");
    expect(rotulos(card("carla@x.com"))).toEqual([
      "Ligações Agendadas",
      "Ligações Realizadas",
      "Reuniões Agendadas",
      "Reuniões Realizadas",
      "Indicações",
      "Inscrições Realizadas",
    ]);
  });

  it("métrica com meta: valor / meta, barra, esperado hoje e chip de ritmo", async () => {
    montar();
    await screen.findByText("Carla");
    const carla = card("carla@x.com");

    const ligacoes = within(carla).getByRole("group", { name: "Ligações Realizadas" });
    expect(ligacoes.textContent).toContain("8 / 10");
    expect(within(ligacoes).getByRole("progressbar")).toBeTruthy();
    expect(ligacoes.textContent).toContain("Esperado hoje: 5");
    expect(within(ligacoes).getByText("No ritmo")).toBeTruthy();

    expect(within(within(carla).getByRole("group", { name: "Reuniões Agendadas" })).getByText("Atrás")).toBeTruthy();
    expect(within(within(carla).getByRole("group", { name: "Indicações" })).getByText("Muito atrás")).toBeTruthy();
  });

  it("métrica sem meta: chip 'Sem meta' e nenhuma barra", async () => {
    montar();
    await screen.findByText("Nathan");
    const semMeta = within(card("nathan@x.com")).getByRole("group", { name: "Reuniões Agendadas" });
    expect(within(semMeta).getByText("Sem meta")).toBeTruthy();
    expect(within(semMeta).queryByRole("progressbar")).toBeNull();
    expect(semMeta.textContent).not.toContain("Esperado hoje");
  });

  it("subtítulo conta metas batidas e no ritmo", async () => {
    montar();
    await screen.findByText("Carla");
    // Carla bateu Reuniões Realizadas (30/10); 4 das 6 estão no ritmo.
    expect(card("carla@x.com").textContent).toContain("1 meta batida · 4 no ritmo");
    expect(card("nathan@x.com").textContent).toContain("1 meta batida · 3 no ritmo");
  });

  it("anel mostra X/Y no ritmo, contando só as métricas com meta", async () => {
    montar();
    await screen.findByText("Nathan");
    expect(within(card("nathan@x.com")).getByRole("img", { name: "3 de 5 metas no ritmo" }).textContent).toBe("3/5");
    expect(within(card("carla@x.com")).getByRole("img", { name: "4 de 6 metas no ritmo" }).textContent).toBe("4/6");
  });

  it("cada card traz a foto da pessoa", async () => {
    montar();
    await screen.findByText("Carla");
    const fotos = Array.from(document.querySelectorAll("[id^='pessoa-'] img")).map((img) => img.getAttribute("src"));
    expect(fotos).toEqual(["https://exemplo/2.png", "https://exemplo/7.png", "https://exemplo/9.png"]);
  });
});

describe("página Time — grade", () => {
  it("ordena os cards pela proporção de metas no ritmo, da maior pra menor", async () => {
    montar();
    await screen.findByText("Nathan");
    expect(ordemDosCards()).toEqual(["jonathan@x.com", "carla@x.com", "nathan@x.com"]);
  });

  it("quem não tem meta nenhuma no período fica fora da grade, num aviso único", async () => {
    montar();
    await screen.findByText("Nathan");
    expect(ordemDosCards()).not.toContain("davi@x.com");
    expect(ordemDosCards()).not.toContain("elisa@x.com");

    const aviso = screen.getByRole("region", { name: "Pessoas sem meta" });
    expect(aviso.textContent).toContain(
      "Elisa e Davi estão sem meta em setembro. Defina as metas para que apareçam no acompanhamento.",
    );
    expect(within(aviso).queryByRole("button")).toBeNull();
    expect(within(aviso).queryByRole("link")).toBeNull();
  });

  it("aviso no singular quando é uma pessoa só", async () => {
    montar("/time?squad=closer");
    await screen.findByText("Carla");
    expect(screen.getByRole("region", { name: "Pessoas sem meta" }).textContent).toContain("Davi está sem meta em setembro.");
  });

  it("no filtro Ano o aviso cita o ano, não o mês de início do período", async () => {
    const api = await import("../src/lib/api");
    const comoAno = (fn: typeof api.buscarComercialSdr) => {
      const original = vi.mocked(fn).getMockImplementation()!;
      vi.mocked(fn).mockImplementationOnce(async (params) => ({
        ...(await original(params)),
        periodo: { granularidade: "ano", inicio: "2026-01-01", fim: "2026-12-31" },
      }));
    };
    comoAno(api.buscarComercialSdr);
    comoAno(api.buscarComercialCloser);

    montar("/time?granularidade=ano");
    await screen.findByText("Nathan");
    const aviso = screen.getByRole("region", { name: "Pessoas sem meta" }).textContent;
    expect(aviso).toContain("sem meta em 2026.");
    expect(aviso).not.toContain("janeiro");
  });

  it("filtro de função mostra só o cargo escolhido", async () => {
    montar("/time?squad=sdr");
    await screen.findByText("Nathan");
    expect(ordemDosCards()).toEqual(["jonathan@x.com", "nathan@x.com"]);
    expect(screen.queryByText("Carla")).toBeNull();
    expect(screen.getByRole("region", { name: "Pessoas sem meta" }).textContent).toContain("Elisa está sem meta");
  });

  it("com filtro de função, quem tem dois cargos aparece sem toggle", async () => {
    montar("/time?squad=closer");
    await screen.findByText("Jonathan");
    const jonathan = card("jonathan@x.com");
    expect(within(jonathan).queryByRole("button")).toBeNull();
    expect(rotulos(jonathan)).toEqual(["Reuniões Realizadas"]);
  });

  it("quem é SDR e Closer vira um card só; o toggle troca métricas, anel e posição", async () => {
    montar();
    await screen.findByText("Jonathan");
    expect(screen.getAllByText("Jonathan")).toHaveLength(1);
    const jonathan = card("jonathan@x.com");
    const botaoSdr = within(jonathan).getByRole("button", { name: "SDR" });
    const botaoCloser = within(jonathan).getByRole("button", { name: "Closer" });

    expect(botaoSdr.getAttribute("aria-pressed")).toBe("true");
    expect(rotulos(jonathan)).toEqual(["Ligações Realizadas"]);
    expect(within(jonathan).getByRole("img", { name: "1 de 1 metas no ritmo" })).toBeTruthy();

    fireEvent.click(botaoCloser);
    expect(botaoCloser.getAttribute("aria-pressed")).toBe("true");
    expect(botaoSdr.getAttribute("aria-pressed")).toBe("false");
    expect(rotulos(jonathan)).toEqual(["Reuniões Realizadas"]);
    expect(within(jonathan).getByRole("img", { name: "0 de 1 metas no ritmo" })).toBeTruthy();
    // 0/1 no ritmo: desce pro fim da grade.
    expect(ordemDosCards()).toEqual(["carla@x.com", "nathan@x.com", "jonathan@x.com"]);
    // A conta de Closer não tem foto: mantém a do SDR.
    expect(jonathan.querySelector("img")?.getAttribute("src")).toBe("https://exemplo/2.png");
  });

  it("publica os dias úteis do período pro cabeçalho", async () => {
    montar();
    await screen.findByText("Nathan");
    await waitFor(() => expect(screen.getByTestId("dias-uteis").textContent).toBe("10/22"));
  });
});

describe("página Time — chegada pela Comercial (#pessoa-…)", () => {
  it("rola até o card do hash, centralizado, e destaca por ~2,4s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    montar("/time?squad=todos#pessoa-carla@x.com");
    await screen.findByText("Carla");

    // O destaque é conferido no mesmo ciclo do scroll: com shouldAdvanceTime o
    // relógio falso anda junto com o real, e um intervalo longo entre as duas
    // checagens (máquina carregada) deixava os 2,4s vencerem antes da asserção.
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(card("carla@x.com").className).toContain("destaque-temporario");
    });
    expect(scrollIntoView.mock.contexts[0]).toBe(card("carla@x.com"));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    expect(card("nathan@x.com").className).not.toContain("destaque-temporario");

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(card("carla@x.com").className).not.toContain("destaque-temporario");
  });

  it("sem animação de rolagem quando o sistema pede movimento reduzido", async () => {
    vi.stubGlobal("matchMedia", (consulta: string) => ({ matches: consulta.includes("reduce"), media: consulta }));
    montar("/time#pessoa-nathan@x.com");
    await screen.findByText("Nathan");
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" }));
  });

  it("hash de alguém que não tem card não rola nada", async () => {
    montar("/time#pessoa-davi@x.com");
    await screen.findByText("Nathan");
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
