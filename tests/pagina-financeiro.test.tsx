// @vitest-environment jsdom
//
// Smoke test de página: renderiza a Financeiro de ponta a ponta (fetch mockado
// + agregações reais) e confere que ela não quebra e mostra os números certos
// pra cima da fixture de 3 vendas de docs/contract/fixtures/financeiro.example.json.
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarFinanceiro } from "../src/lib/api";
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
    valor_pgto_2: 0,
    taxa_pgto_2: 0,
    liquido_pgto_2: 0,
    forma_pgto_2: null,
    user_closer: 1,
    closer: "Jacob",
    id_planilha: 1,
    recebimentos: [],
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
    valor_pgto_2: 0,
    taxa_pgto_2: 0,
    liquido_pgto_2: 0,
    forma_pgto_2: null,
    user_closer: null,
    closer: null,
    id_planilha: 2,
    recebimentos: [],
  },
];

const DADO: RespostaFinanceiro = {
  periodo: { granularidade: "ano", inicio: "2026-01-01", fim: "2026-09-21" },
  cards: [],
  vendas: VENDAS,
};

const CLOSERS: Pessoa[] = [{ id: "1", nome: "Jacob", cargo: "closer", email: "jacob@x.com", imagem_url: null }];

const VENDAS_COM_RECEBIMENTO: RespostaFinanceiro["vendas"] = [
  { ...VENDAS[0], recebimentos: [{ mes: "2026-09", pago: 100000, liquido: 90000 }] },
  { ...VENDAS[1], valor_bruto_contrato: 5000, recebimentos: [] },
];

vi.mock("../src/lib/api", () => ({
  buscarFinanceiro: vi.fn(async () => DADO),
  buscarPessoas: vi.fn(async () => CLOSERS),
}));

function montar(rota = "/?granularidade=mes&periodo=2026-09") {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AtualizacaoProvider>
        <Financeiro />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

describe("página Financeiro", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renderiza os 4 cards, os gráficos e as 4 tabelas sem quebrar", async () => {
    montar();

    await waitFor(() => expect(screen.getByText("Contrato bruto vendido")).toBeTruthy());
    expect(screen.getByText("Recebimento bruto")).toBeTruthy();
    expect(screen.getByText("Liquidou na conta")).toBeTruthy();
    expect(screen.getByText("Bruto vendido no ano")).toBeTruthy();

    // 100000 + 5000 = 105000, formatado em BRL
    expect(screen.getAllByText(/R\$\s*105\.000,00/).length).toBeGreaterThan(0);

    expect(screen.getAllByText("Vendido").length).toBeGreaterThan(0);
    expect(screen.getByText("Total recebido × Liquidou")).toBeTruthy();

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

  it("cards mostram ticket médio, parte do recebido vinda de contrato do mês e descontos", async () => {
    vi.mocked(buscarFinanceiro).mockResolvedValueOnce({ ...DADO, vendas: VENDAS_COM_RECEBIMENTO });
    montar();

    await waitFor(() => expect(screen.getByText(/ticket médio R\$\s*52\.500,00 · 2 contratos fechados/)).toBeTruthy());
    expect(screen.getByText(/R\$\s*100\.000,00 veio de contrato fechado no período/)).toBeTruthy();
    expect(screen.getByText(/R\$\s*10\.000,00 de taxas de maquininha e imposto/)).toBeTruthy();
  });

  it("em dia ou semana os recebimentos mostram travessão com a legenda de só por mês", async () => {
    // Em dia/semana o período é sempre o corrente (ver `useFiltrosAtuais`), então fixa-se a data de hoje em 12/09.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 12, 12));
    vi.mocked(buscarFinanceiro).mockResolvedValueOnce({ ...DADO, vendas: VENDAS_COM_RECEBIMENTO });
    montar("/?granularidade=dia&periodo=2026-09-12");

    await waitFor(() => expect(screen.getByText("Contrato bruto vendido")).toBeTruthy());

    const cardVendido = screen.getByText("Contrato bruto vendido").closest("article")!;
    expect(within(cardVendido).getByText(/^R\$\s*100\.000,00$/)).toBeTruthy();

    for (const rotulo of ["Recebimento bruto", "Liquidou na conta"]) {
      const card = screen.getByText(rotulo).closest("article")!;
      expect(within(card).getByText("—")).toBeTruthy();
    }
    expect(screen.getAllByText("Recebimentos só por mês")).toHaveLength(2);

    const colunas = ["Pago no mês", "Líquido no mês", "Pago pelo cliente", "Taxa (R$)", "Líquido na conta", "% de taxa"];
    for (const titulo of colunas) {
      for (const cabecalho of screen.getAllByRole("columnheader", { name: titulo })) {
        const th = cabecalho as HTMLTableCellElement;
        const tabela = th.closest("table")!;
        const celulas = Array.from(tabela.querySelectorAll("tbody tr, tfoot tr")).map((tr) => tr.children[th.cellIndex]?.textContent);
        expect(celulas.length).toBeGreaterThan(0);
        expect(celulas.every((texto) => texto === "—")).toBe(true);
      }
    }
  });
});
