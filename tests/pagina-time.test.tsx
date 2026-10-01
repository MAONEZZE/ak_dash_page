// @vitest-environment jsdom
//
// Página Time: um card grande por pessoa só com as métricas de ligação e
// reunião do cargo, na ordem ligações agendadas → ligações realizadas →
// reuniões agendadas → reuniões realizadas, com a barra enchendo por
// realizado/meta do período.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
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
  };
}

function pessoa(id: string, nome: string, metricas: Metrica[]): PessoaComercial {
  return {
    id_user: id,
    email: `${nome.toLowerCase()}@x.com`,
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
    periodo_parcial: true,
    avisos: [],
    pessoas,
    serie_diaria: [],
  };
}

vi.mock("../src/lib/api", () => ({
  buscarComercialSdr: vi.fn(async () =>
    resposta([
      pessoa("9", "Nathan", [
        metrica("fups", "Follow-ups", 12),
        metrica("reunioes_agendadas", "Reuniões Agendadas", 3, null),
        metrica("ligacoes_agendadas", "Ligações Agendadas", 5),
        metrica("indicacoes", "Indicações", 2),
      ]),
      pessoa("2", "Jonathan", [metrica("ligacoes_agendadas", "Ligações Agendadas", 6)]),
    ]),
  ),
  buscarComercialCloser: vi.fn(async () =>
    resposta([
      pessoa("7", "Carla", [
        metrica("indicacoes", "Indicações", 1),
        metrica("reunioes_realizadas", "Reuniões Realizadas", 30),
        metrica("reunioes_agendadas", "Reuniões Agendadas", 4),
        metrica("ligacoes_realizadas", "Ligações Realizadas", 8),
      ]),
      pessoa("8", "Davi", [
        { ...metrica("ligacoes_realizadas", "Ligações Realizadas", 0, 0), status: "sem_preenchimento" },
        { ...metrica("reunioes_agendadas", "Reuniões Agendadas", 2, 0), status: "sem_meta" },
        // numeric do Postgres serializado como string
        { ...metrica("reunioes_realizadas", "Reuniões Realizadas", 1, 0), meta_periodo: "0.00" as unknown as number, status: "sem_meta" },
      ]),
      // Mesma pessoa do SDR "2", outra conta: id diferente, mesmo email.
      { ...pessoa("10", "Jonathan", [metrica("reunioes_realizadas", "Reuniões Realizadas", 4)]), imagem_url: null },
    ]),
  ),
}));

function montar(querystring = "/time") {
  return render(
    <MemoryRouter initialEntries={[querystring]}>
      <AtualizacaoProvider>
        <Time />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

function card(nome: string): HTMLElement {
  return screen.getByText(nome).closest(".glass-panel") as HTMLElement;
}

function rotulos(el: HTMLElement): string[] {
  return within(el)
    .getAllByText(/^(Ligações|Reuniões|Follow-ups|Indicações)/)
    .map((n) => n.textContent ?? "");
}

afterEach(() => cleanup());

describe("página Time", () => {
  it("SDR mostra só ligações e reuniões agendadas, na ordem fixa", async () => {
    montar();
    await screen.findByText("Nathan");
    expect(rotulos(card("Nathan"))).toEqual(["Ligações Agendadas", "Reuniões Agendadas"]);
  });

  it("closer mostra as 3 métricas dele, na ordem fixa", async () => {
    montar();
    await screen.findByText("Carla");
    expect(rotulos(card("Carla"))).toEqual(["Ligações Realizadas", "Reuniões Agendadas", "Reuniões Realizadas"]);
  });

  it("barra vai até 125% da meta (meta em 80% da largura), e fica hachurada sem meta", async () => {
    montar();
    await screen.findByText("Nathan");
    const nathan = card("Nathan");
    const carla = card("Carla");

    const ligacoes = within(nathan).getByTestId("barra-ligacoes_agendadas").firstElementChild as HTMLElement;
    expect(ligacoes.style.width).toBe("40%");

    const reunioes = within(carla).getByTestId("barra-reunioes_realizadas").firstElementChild as HTMLElement;
    expect(reunioes.style.width).toBe("100%");

    const semMeta = within(nathan).getByTestId("barra-reunioes_agendadas");
    expect(semMeta.firstElementChild).toBeNull();
    expect(semMeta.style.background).toContain("repeating-linear-gradient");
    expect(within(nathan).queryByTestId("meta-reunioes_agendadas")).toBeNull();
  });

  it("traço da meta corta a barra em 80% da largura", async () => {
    montar();
    await screen.findByText("Nathan");
    expect(within(card("Nathan")).getByTestId("meta-ligacoes_agendadas").style.left).toBe("80%");
  });

  it("meta 0 não tem traço de meta", async () => {
    montar();
    await screen.findByText("Davi");
    const davi = card("Davi");
    expect(within(davi).queryByTestId("meta-ligacoes_realizadas")).toBeNull();
    expect(within(davi).queryByTestId("meta-reunioes_agendadas")).toBeNull();
    expect(within(davi).queryByTestId("meta-reunioes_realizadas")).toBeNull();
  });

  it("cor do preenchimento: vermelho abaixo de 50% da meta, amarelo até a meta, verde bateu/passou", async () => {
    montar();
    await screen.findByText("Carla");
    const fill = (nome: string, chave: string) => within(card(nome)).getByTestId(`barra-${chave}`).firstElementChild as HTMLElement;

    expect(fill("Carla", "reunioes_agendadas").className).toContain("bg-perigo"); // 4/10
    expect(fill("Nathan", "ligacoes_agendadas").className).toContain("bg-atencao"); // 5/10
    expect(fill("Carla", "reunioes_realizadas").className).toContain("bg-status-good"); // 30/10
    expect(fill("Davi", "reunioes_agendadas").className).toContain("bg-status-good"); // meta 0 com lançamento
  });

  it("meta 0 mostra barra normal, não hachurada: vazia sem lançamento, cheia com lançamento", async () => {
    montar();
    await screen.findByText("Davi");
    const davi = card("Davi");

    const semLancamento = within(davi).getByTestId("barra-ligacoes_realizadas").firstElementChild as HTMLElement;
    expect(semLancamento.style.width).toBe("0%");

    const comLancamento = within(davi).getByTestId("barra-reunioes_agendadas").firstElementChild as HTMLElement;
    expect(comLancamento.style.width).toBe("100%");
  });

  it("filtro de squad mostra só o cargo escolhido", async () => {
    montar("/time?squad=sdr");
    await screen.findByText("Nathan");
    expect(screen.queryByText("Carla")).toBeNull();
    expect(screen.queryByText("Davi")).toBeNull();
  });

  it("cada card traz a foto da pessoa", async () => {
    const { container } = montar();
    await screen.findByText("Carla");
    const fotos = Array.from(container.querySelectorAll("img")).map((img) => img.getAttribute("src"));
    expect(fotos).toEqual(["https://exemplo/9.png", "https://exemplo/2.png", "https://exemplo/7.png", "https://exemplo/8.png"]);
  });

  it("quem é SDR e Closer vira um card só, com toggle que troca as métricas", async () => {
    montar();
    await screen.findByText("Jonathan");
    expect(screen.getAllByText("Jonathan")).toHaveLength(1);
    const jonathan = card("Jonathan");
    const botaoSdr = within(jonathan).getByRole("button", { name: "SDR" });
    const botaoCloser = within(jonathan).getByRole("button", { name: "Closer" });

    expect(botaoSdr.getAttribute("aria-pressed")).toBe("true");
    expect(rotulos(jonathan)).toEqual(["Ligações Agendadas"]);

    fireEvent.click(botaoCloser);
    expect(botaoCloser.getAttribute("aria-pressed")).toBe("true");
    expect(botaoSdr.getAttribute("aria-pressed")).toBe("false");
    expect(rotulos(jonathan)).toEqual(["Reuniões Realizadas"]);
    // A conta de Closer não tem foto: mantém a do SDR.
    expect(jonathan.querySelector("img")?.getAttribute("src")).toBe("https://exemplo/2.png");
  });

  it("com filtro de squad, quem tem dois cargos aparece sem toggle", async () => {
    montar("/time?squad=closer");
    await screen.findByText("Jonathan");
    const jonathan = card("Jonathan");
    expect(within(jonathan).queryByRole("button")).toBeNull();
    expect(rotulos(jonathan)).toEqual(["Reuniões Realizadas"]);
  });
});
