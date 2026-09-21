// @vitest-environment jsdom
//
// Smoke test de página: renderiza a Financeiro de ponta a ponta (fetch mockado
// + agregações reais) e confere que ela não quebra e mostra os números certos
// pra cima da fixture de 3 vendas de docs/contract/fixtures/financeiro.example.json.
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import { Financeiro } from "../src/paginas/Financeiro";
import type { Pessoa, RespostaFinanceiro } from "../src/lib/tipos-api";

const VENDAS: RespostaFinanceiro["vendas"] = [
  {
    id: 1,
    data_venda: "2026-09-12T00:00:00",
    cliente: "Maria Silva",
    produto: "Produto de Ativação",
    canal: "Instagram",
    metodo_pagamento: "PIX",
    num_parcelas: 1,
    valor_bruto_contrato: 100000,
    valor_entrada: 100000,
    liquido_entrada: 90000,
    imposto: 0.1,
    taxa: 0,
    user_closer: 1,
    closer: "Jacob",
  },
  {
    id: 2,
    data_venda: "2026-09-08T00:00:00",
    cliente: null,
    produto: "Produto de Entrada",
    canal: null,
    metodo_pagamento: "",
    num_parcelas: null,
    valor_bruto_contrato: 5000,
    valor_entrada: 5000,
    liquido_entrada: 4500,
    imposto: 0.1,
    taxa: 0,
    user_closer: null,
    closer: null,
  },
];

const DADO: RespostaFinanceiro = {
  periodo: { granularidade: "ano", inicio: "2026-01-01", fim: "2026-09-21" },
  cards: [],
  vendas: VENDAS,
};

const CLOSERS: Pessoa[] = [{ id: "1", nome: "Jacob", cargo: "closer", email: "jacob@x.com", imagem_url: null }];

vi.mock("../src/lib/api", () => ({
  buscarFinanceiro: vi.fn(async () => DADO),
  buscarPessoas: vi.fn(async () => CLOSERS),
}));

function montar() {
  return render(
    <MemoryRouter initialEntries={["/?granularidade=mes&periodo=2026-09"]}>
      <AtualizacaoProvider>
        <Financeiro />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

describe("página Financeiro", () => {
  afterEach(() => cleanup());

  it("renderiza os 4 cards, os gráficos e as 4 tabelas sem quebrar", async () => {
    montar();

    await waitFor(() => expect(screen.getByText("Contrato bruto vendido")).toBeTruthy());
    expect(screen.getByText("Recebimento bruto")).toBeTruthy();
    expect(screen.getByText("Liquidou na conta")).toBeTruthy();
    expect(screen.getByText("Bruto vendido no ano (YTD)")).toBeTruthy();

    // 100000 + 5000 = 105000, formatado em BRL
    expect(screen.getAllByText(/R\$\s*105\.000,00/).length).toBeGreaterThan(0);

    expect(screen.getAllByText("Vendido").length).toBeGreaterThan(0);
    expect(screen.getByText("Pago × Líquido")).toBeTruthy();

    expect(screen.getByText("Por canal")).toBeTruthy();
    expect(screen.getByText("Como entrou o dinheiro")).toBeTruthy();
    expect(screen.getByText("Desempenho por closer")).toBeTruthy();
    expect(screen.getByText("Desempenho por produto")).toBeTruthy();
  });

  it("aplica os rótulos de valor ausente: canal null vira 'Sem canal', metodo vazio vira 'Não informado', closer null vira 'Sem closer definido'", async () => {
    montar();
    await waitFor(() => expect(screen.getByText("Jacob")).toBeTruthy());

    expect(screen.getByText("Não informado")).toBeTruthy();
    expect(screen.getByText("Sem closer definido")).toBeTruthy();
    expect(screen.getByText("Sem canal")).toBeTruthy();
  });
});
