// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { VisaoGeralComercial } from "../src/componentes/VisaoGeralComercial";
import type { RespostaComercial } from "../src/lib/tipos-api";

const DADO: RespostaComercial = {
  periodo: { granularidade: "mes", inicio: "2026-09-01", fim: "2026-09-30" },
  periodo_parcial: true,
  avisos: [],
  serie_diaria: [
    { dia: 1, metricas: { conexoes_enviadas: 30, conexoes_aceitas: 10 } },
    { dia: 2, metricas: { conexoes_enviadas: 50, conexoes_aceitas: 20 } },
  ],
  pessoas: [
    {
      email: "a@teste.com",
      nome: "Ana",
      metas_atingidas: { atingidas: 1, total: 2 },
      pontuacao_total: 15,
      posicao: 1,
      planilhas_origem: ["a.csv"],
      metricas: [
        { metrica: "conexoes_enviadas", nome_exibicao: "Conexões Enviadas", meta_periodo: 100, realizado: 120, status: "atingido", dias_com_lacuna: 0 },
        { metrica: "conexoes_aceitas", nome_exibicao: "Conexões Aceitas", meta_periodo: 100, realizado: 40, status: "abaixo_da_meta", dias_com_lacuna: 0 },
      ],
    },
    {
      email: "b@teste.com",
      nome: "Bruno",
      metas_atingidas: { atingidas: 0, total: 2 },
      pontuacao_total: 3,
      posicao: 2,
      planilhas_origem: ["b.csv"],
      metricas: [
        { metrica: "conexoes_enviadas", nome_exibicao: "Conexões Enviadas", meta_periodo: 100, realizado: 0, status: "sem_preenchimento", dias_com_lacuna: 30 },
        { metrica: "conexoes_aceitas", nome_exibicao: "Conexões Aceitas", meta_periodo: 100, realizado: 20, status: "abaixo_da_meta", dias_com_lacuna: 0 },
      ],
    },
  ],
};

function renderComRouter(dado: RespostaComercial, pessoasSelecionadas: string[] = []) {
  return render(
    <MemoryRouter>
      <VisaoGeralComercial dado={dado} pessoasSelecionadas={pessoasSelecionadas} />
    </MemoryRouter>,
  );
}

describe("VisaoGeralComercial", () => {
  it("renderiza o hero consolidado, a pizza, as colunas, a linha e a tabela sem lançar exceção", () => {
    renderComRouter(DADO);

    expect(screen.getByText("Consolidado do time")).toBeTruthy();
    expect(screen.getByText("Atingido")).toBeTruthy(); // legenda da pizza
    expect(screen.getAllByText("Abaixo da meta").length).toBeGreaterThan(0); // legenda da pizza + KPI
    expect(screen.getByText("Sem preenchimento")).toBeTruthy();
    expect(screen.getAllByText("Conexões Enviadas").length).toBeGreaterThan(0); // seletor da linha + tabela
    expect(screen.getByText("Ana")).toBeTruthy(); // comparativo da tabela
    expect(screen.getByText("Bruno")).toBeTruthy();
  });

  it("mostra título individual quando só uma pessoa está selecionada", () => {
    const umaPessoa: RespostaComercial = { ...DADO, pessoas: [DADO.pessoas[0]] };
    renderComRouter(umaPessoa, ["a@teste.com"]);
    expect(screen.getByText("de Ana")).toBeTruthy();
  });

  it("degrada sem quebrar quando não há pessoas nem série diária", () => {
    const vazio: RespostaComercial = { ...DADO, pessoas: [], serie_diaria: [] };
    renderComRouter(vazio);
    expect(screen.getByText(/sem meta cadastrada/i)).toBeTruthy();
    expect(screen.getByText(/sem evolução diária/i)).toBeTruthy();
  });
});
