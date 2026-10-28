// @vitest-environment jsdom
// Página Time: um card por pessoa (chave = id_user, que no dash2 é o mesmo em todos os cargos) com as métricas da aba Dashboard. Pessoas podem vir sem e-mail.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtualizacaoProvider, useAtualizacao } from "../src/lib/atualizacao";
import { Time } from "../src/paginas/Time";
import type { Metrica, PessoaComercial, RespostaComercial } from "../src/lib/tipos-api";

function metrica(chave: string, nome: string, realizado: number, meta: number | null = 10): Metrica {
  return {
    metrica: chave,
    nome_exibicao: nome,
    meta_periodo: meta,
    realizado,
    status: meta === null ? "sem_meta" : realizado >= meta ? "atingido" : "abaixo_da_meta",
    dias_com_lacuna: 0,
    pct_atingimento: meta ? Math.round((realizado / meta) * 1000) / 10 : null,
    falta_folga: !meta ? null : realizado < meta ? { tipo: "falta", valor: meta - realizado } : { tipo: "folga", valor: realizado - meta },
    horas_restantes: null,
    media_necessaria: null,
    previsao: null,
  };
}

function pessoa(id: string, nome: string, metricas: Metrica[], email: string | null = `${nome.toLowerCase()}@x.com`): PessoaComercial {
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
    metricas_time: [],
    serie_diaria: [],
  };
}

vi.mock("../src/lib/api", () => ({
  buscarComercialSeller: vi.fn(async () => resposta([])),
  buscarComercialSdr: vi.fn(async () =>
    resposta([
      pessoa("9", "Nathan", [
        metrica("ligacoes_efetuadas", "Ligações Efetuadas", 40),
        metrica("inscricoes_realizadas", "Inscrições Realizadas", 8),
        metrica("indicacoes", "Indicações", 5),
        metrica("reunioes_agendadas", "Reuniões Agendadas", 3, null),
      ]),
      pessoa("2", "Jonathan", [metrica("inscricoes_realizadas", "Inscrições Realizadas", 10)]),
      pessoa("11", "Juca", [metrica("indicacoes", "Indicações", 1)], null),
    ]),
  ),
  buscarComercialCloser: vi.fn(async () =>
    resposta([
      pessoa(
        "7",
        "Carla",
        [
          metrica("ligacoes_realizadas", "Ligações Realizadas", 8),
          metrica("reunioes_agendadas", "Reuniões Agendadas", 7),
          metrica("reunioes_realizadas", "Reuniões Realizadas", 30),
          metrica("indicacoes", "Indicações", 2),
          metrica("inscricoes_realizadas", "Inscrições Realizadas", 4),
        ],
        "Carla@X.com",
      ),
      pessoa("8", "Davi", [
        { ...metrica("reunioes_agendadas", "Reuniões Agendadas", 0, 0), status: "sem_preenchimento" },
        // numeric do Postgres serializado como string
        { ...metrica("reunioes_realizadas", "Reuniões Realizadas", 1, 0), meta_periodo: "0.00" as unknown as number, status: "sem_meta" },
      ]),
      // Mesma pessoa do SDR "2": no dash2 o id é o mesmo nos dois cargos.
      { ...pessoa("2", "Jonathan", [metrica("reunioes_realizadas", "Reuniões Realizadas", 1)]), imagem_url: null },
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

function card(id: string): HTMLElement {
  const el = document.getElementById(`pessoa-${id}`);
  if (!el) throw new Error(`card de ${id} não renderizado`);
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
  it("SDR mostra só as métricas da aba Dashboard, na ordem da planilha", async () => {
    montar();
    await screen.findByText("Nathan");
    expect(rotulos(card("9"))).toEqual(["Inscrições Realizadas", "Indicações", "Reuniões Agendadas"]);
  });

  it("closer mostra só as métricas da aba Dashboard, na ordem da planilha", async () => {
    montar();
    await screen.findByText("Carla");
    expect(rotulos(card("7"))).toEqual(["Reuniões Agendadas", "Reuniões Realizadas", "Indicações", "Inscrições Realizadas"]);
  });

  it("pessoa sem e-mail aparece, com o card identificado pelo id", async () => {
    montar();
    await screen.findByText("Juca");
    expect(card("11").textContent).toContain("Juca");
  });

  it("cada card traz a foto da pessoa", async () => {
    montar();
    await screen.findByText("Carla");
    const fotos = Array.from(document.querySelectorAll("[id^='pessoa-'] img")).map((img) => img.getAttribute("src"));
    expect(fotos.sort()).toEqual([
      "https://exemplo/11.png",
      "https://exemplo/2.png",
      "https://exemplo/7.png",
      "https://exemplo/8.png",
      "https://exemplo/9.png",
    ]);
  });

  it("métrica com meta: valor / meta, barra e Falta/% na cor do terço da meta", async () => {
    montar();
    await screen.findByText("Carla");
    const carla = card("7");

    const indicacoes = within(carla).getByRole("group", { name: "Indicações" });
    expect(indicacoes.textContent).toContain("2 / 10");
    expect(indicacoes.textContent).toContain("Falta 8");
    expect(indicacoes.textContent).toContain("20% de atingimento");
    expect(within(indicacoes).getByText("8").className).toContain("text-bad");
    expect(within(indicacoes).getByText("20%").className).toContain("text-bad");
    expect(within(indicacoes).getByRole("progressbar").firstElementChild?.className).toContain("bg-bad");

    const inscricoes = within(carla).getByRole("group", { name: "Inscrições Realizadas" });
    expect(within(inscricoes).getByText("40%").className).toContain("text-warn");
    expect(within(inscricoes).getByRole("progressbar").firstElementChild?.className).toContain("bg-warn-bar");

    const reunioes = within(carla).getByRole("group", { name: "Reuniões Realizadas" });
    expect(reunioes.textContent).toContain("Folga 20");
    expect(within(reunioes).getByText("300%").className).toContain("text-ok");
    expect(within(reunioes).getByRole("progressbar").firstElementChild?.className).toContain("bg-ok");

    expect(carla.textContent).not.toContain("Esperado hoje");
    expect(carla.textContent).not.toContain("No ritmo");
    expect(carla.textContent).not.toContain("Atrás");
  });

  it("métrica sem meta: \"Meta aberta\", valor / 0 e barra cheia azul", async () => {
    montar();
    await screen.findByText("Nathan");
    const agendadas = within(card("9")).getByRole("group", { name: "Reuniões Agendadas" });

    expect(within(agendadas).getByText("Meta aberta")).toBeTruthy();
    expect(agendadas.textContent).toContain("3 / 0");
    const barra = within(agendadas).getByRole("progressbar").firstElementChild as HTMLElement;
    expect(barra.style.width).toBe("100%");
    expect(barra.className).toContain("bg-aberta");
    expect(agendadas.textContent).not.toContain("Falta");
    expect(agendadas.textContent).not.toContain("atingimento");
  });
});

describe("página Time — grade", () => {
  it("quem não tem meta nenhuma continua na grade, com as métricas abertas", async () => {
    montar();
    await screen.findByText("Davi");
    // meta "0.00" (numeric como string) vira 0: valor / 0, não some.
    expect(within(card("8")).getByRole("group", { name: "Reuniões Realizadas" }).textContent).toContain("1 / 0");
  });

  it("filtro de função mostra só o cargo escolhido", async () => {
    montar("/time?squad=sdr");
    await screen.findByText("Nathan");
    expect(ordemDosCards().sort()).toEqual(["11", "2", "9"]);
    expect(screen.queryByText("Carla")).toBeNull();
  });

  it("filtro de função com Sellers e SDRs mostra só esses cargos", async () => {
    montar("/time?squad=seller,sdr");
    await screen.findByText("Nathan");
    expect(ordemDosCards().sort()).toEqual(["11", "2", "9"]);
    expect(screen.queryByText("Carla")).toBeNull();
  });

  it("com filtro de função, quem tem dois cargos aparece sem toggle", async () => {
    montar("/time?squad=closer");
    await screen.findByText("Jonathan");
    const jonathan = card("2");
    expect(within(jonathan).queryByRole("button")).toBeNull();
    expect(rotulos(jonathan)).toEqual(["Reuniões Realizadas"]);
  });

  it("quem é SDR e Closer vira um card só; o toggle troca as métricas", async () => {
    montar();
    await screen.findByText("Jonathan");
    expect(screen.getAllByText("Jonathan")).toHaveLength(1);
    const jonathan = card("2");
    const botaoSdr = within(jonathan).getByRole("button", { name: "SDR" });
    const botaoCloser = within(jonathan).getByRole("button", { name: "Closer" });

    expect(botaoSdr.getAttribute("aria-pressed")).toBe("true");
    expect(rotulos(jonathan)).toEqual(["Inscrições Realizadas"]);

    fireEvent.click(botaoCloser);
    expect(botaoCloser.getAttribute("aria-pressed")).toBe("true");
    expect(botaoSdr.getAttribute("aria-pressed")).toBe("false");
    expect(rotulos(jonathan)).toEqual(["Reuniões Realizadas"]);
    // A conta de Closer não tem foto: mantém a do SDR.
    expect(jonathan.querySelector("img")?.getAttribute("src")).toBe("https://exemplo/2.png");
  });

  it("publica os dias úteis do período pro cabeçalho", async () => {
    montar();
    await screen.findByText("Nathan");
    await waitFor(() => expect(screen.getByTestId("dias-uteis").textContent).toBe("10/22"));
  });

  it("sem título da página", async () => {
    montar();
    await screen.findByText("Nathan");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});

describe("página Time — métricas no verde", () => {
  it("subtítulo conta metas batidas e no verde", async () => {
    montar();
    await screen.findByText("Carla");
    expect(card("7").textContent).toContain("1 meta batida · 2 no verde");
    expect(card("9").textContent).toContain("0 metas batidas · 1 no verde");
  });

  it("anel mostra X/Y no verde, contando só as métricas com meta", async () => {
    montar();
    await screen.findByText("Carla");
    expect(within(card("9")).getByRole("img", { name: "1 de 2 metas no verde" }).textContent).toBe("1/2");
    expect(within(card("7")).getByRole("img", { name: "2 de 4 metas no verde" }).textContent).toBe("2/4");
  });

  it("ordena os cards pela proporção de métricas no verde, da maior pra menor", async () => {
    montar();
    await screen.findByText("Carla");
    expect(ordemDosCards()).toEqual(["2", "9", "7", "11", "8"]);
  });

  it("o toggle de cargo também troca o anel e a posição", async () => {
    montar();
    await screen.findByText("Jonathan");
    fireEvent.click(within(card("2")).getByRole("button", { name: "Closer" }));
    expect(within(card("2")).getByRole("img", { name: "0 de 1 metas no verde" })).toBeTruthy();
    expect(ordemDosCards()).toEqual(["9", "7", "2", "11", "8"]);
  });
});

describe("página Time — chegada pela Comercial (#pessoa-…)", () => {
  it("rola até o card do hash, centralizado, e destaca por ~2,4s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    montar("/time?squad=todos#pessoa-7");
    await screen.findByText("Carla");

    // O destaque é conferido no mesmo ciclo do scroll: com shouldAdvanceTime o
    // relógio falso anda junto com o real, e um intervalo longo entre as duas
    // checagens (máquina carregada) deixava os 2,4s vencerem antes da asserção.
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(card("7").className).toContain("destaque-temporario");
    });
    expect(scrollIntoView.mock.contexts[0]).toBe(card("7"));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
    expect(card("9").className).not.toContain("destaque-temporario");

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(card("7").className).not.toContain("destaque-temporario");
  });

  it("sem animação de rolagem quando o sistema pede movimento reduzido", async () => {
    vi.stubGlobal("matchMedia", (consulta: string) => ({ matches: consulta.includes("reduce"), media: consulta }));
    montar("/time#pessoa-9");
    await screen.findByText("Nathan");
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" }));
  });

  it("hash de alguém que não tem card não rola nada", async () => {
    montar("/time#pessoa-999");
    await screen.findByText("Nathan");
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
