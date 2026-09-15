// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TimeComercialLista, type PessoaUnificada } from "../src/componentes/TimeComercialLista";
import type { PessoaComercial } from "../src/lib/tipos-api";

function pessoaComercial(parcial: Partial<PessoaComercial>): PessoaComercial {
  return {
    id_user: "1",
    email: "a@teste.com",
    nome: "Ana",
    metas_atingidas: { atingidas: 1, total: 2 },
    metricas: [],
    pontuacao_total: 0,
    posicao: 1,
    contas_origem: [],
    ...parcial,
  };
}

const ANA: PessoaUnificada = {
  squad: "sdr",
  pessoa: pessoaComercial({
    id_user: "4",
    email: "ana@teste.com",
    nome: "Ana",
    metas_atingidas: { atingidas: 1, total: 2 },
    metricas: [
      { metrica: "conexoes_enviadas", nome_exibicao: "Conexões Enviadas", meta_periodo: 100, realizado: 120, status: "atingido", dias_com_lacuna: 0 },
      { metrica: "conexoes_aceitas", nome_exibicao: "Conexões Aceitas", meta_periodo: 100, realizado: 40, status: "abaixo_da_meta", dias_com_lacuna: 0 },
    ],
  }),
};

const BRUNO: PessoaUnificada = {
  squad: "closer",
  pessoa: pessoaComercial({
    id_user: "1",
    email: "bruno@teste.com",
    nome: "Bruno",
    metas_atingidas: { atingidas: 0, total: 1 },
    metricas: [
      { metrica: "reunioes_realizadas", nome_exibicao: "Reuniões Realizadas", meta_periodo: 10, realizado: 0, status: "sem_preenchimento", dias_com_lacuna: 30 },
    ],
  }),
};

// Mesmo email em cargos diferentes (ex. "Jonathan" SDR e Closer) — o front
// tem que distinguir os dois cards pelo id_user, não pelo email.
const JONATHAN_SDR: PessoaUnificada = {
  squad: "sdr",
  pessoa: pessoaComercial({
    id_user: "2",
    email: "jonathan@teste.com",
    nome: "Jonathan",
    metricas: [{ metrica: "numeros_captados", nome_exibicao: "Números Captados", meta_periodo: null, realizado: 5, status: "sem_meta", dias_com_lacuna: 0 }],
  }),
};
const JONATHAN_CLOSER: PessoaUnificada = {
  squad: "closer",
  pessoa: pessoaComercial({
    id_user: "10",
    email: "jonathan@teste.com",
    nome: "Jonathan",
    metricas: [
      { metrica: "indicacoes", nome_exibicao: "Indicações", meta_periodo: null, realizado: 2, status: "sem_meta", dias_com_lacuna: 0 },
    ],
  }),
};

function renderLista(pessoas: PessoaUnificada[]) {
  return render(<TimeComercialLista pessoas={pessoas} granularidade="mes" />);
}

describe("TimeComercialLista", () => {
  afterEach(() => cleanup());

  it("renderiza um card por pessoa com nome e squad", () => {
    renderLista([ANA, BRUNO]);
    expect(screen.getByText("Ana")).toBeTruthy();
    expect(screen.getByText("Bruno")).toBeTruthy();
    expect(screen.getByText(/SDR ·/)).toBeTruthy();
    expect(screen.getByText(/Closer ·/)).toBeTruthy();
  });

  it("abre o modal com todas as métricas ao clicar no card", () => {
    renderLista([ANA]);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByText("Ana"));

    const modal = screen.getByRole("dialog");
    expect(modal).toBeTruthy();
    expect(screen.getAllByText("Conexões Enviadas").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Conexões Aceitas").length).toBeGreaterThan(0);
  });

  it("fecha o modal ao clicar em Fechar", () => {
    renderLista([ANA]);
    fireEvent.click(screen.getByText("Ana"));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("degrada sem lançar exceção quando não há pessoas", () => {
    renderLista([]);
    expect(screen.getByText(/nenhuma pessoa com dado lançado/i)).toBeTruthy();
  });

  it("duas pessoas com o mesmo email (id_user diferente) abrem modais distintos", () => {
    renderLista([JONATHAN_SDR, JONATHAN_CLOSER]);
    const cards = screen.getAllByText("Jonathan");
    expect(cards).toHaveLength(2);

    fireEvent.click(cards[0]);
    const { getByText, queryByText } = within(screen.getByRole("dialog"));
    expect(getByText("Números Captados")).toBeTruthy();
    expect(queryByText("Indicações")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    fireEvent.click(cards[1]);
    expect(within(screen.getByRole("dialog")).getByText("Indicações")).toBeTruthy();
  });
});
