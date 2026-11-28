// @vitest-environment jsdom
//
// Smoke test de página: renderiza a Financeiro de ponta a ponta (fetch mockado
// + agregações reais sobre as notas das abas NFS) e confere o layout novo:
// 5 cards, 2 gráficos, mês a mês e as 3 tabelas.
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import { Financeiro } from "../src/paginas/Financeiro";
import type { NotaFinanceiro, RespostaFinanceiro } from "../src/lib/tipos-api";

function nota(over: Partial<NotaFinanceiro>): NotaFinanceiro {
  return { chave: "x", mes: "2026-09", data_referencia: "2026-09-01", cliente: null, categoria: null, produto: null, valor_pago: 0, valor_venda: 0, forma_pagamento: "Outros", canal: null, ...over };
}
const NOTAS: NotaFinanceiro[] = [
  nota({ chave: "n1", mes: "2026-09", data_referencia: "2026-09-12", categoria: "venda nova", produto: "Aceleração", valor_pago: 10000, valor_venda: 60000, forma_pagamento: "Cartão", canal: "LinkedIn" }),
  nota({ chave: "n2", mes: "2026-09", data_referencia: "2026-09-08", categoria: "mensalidade cliente", produto: "Tração", valor_pago: 5000, valor_venda: 0, forma_pagamento: "PIX", canal: null }),
  nota({ chave: "n3", mes: "2026-09", data_referencia: "2026-09-20", categoria: "upsell", produto: "Sprint", valor_pago: 3000, valor_venda: 20000, forma_pagamento: "Outros", canal: "Indicação" }),
  nota({ chave: "n4", mes: "2026-09", data_referencia: "2026-09-01", categoria: null, produto: null, valor_pago: 2000, valor_venda: 0, forma_pagamento: "Boleto", canal: null }),
  nota({ chave: "n5", mes: "2026-08", data_referencia: "2026-08-10", categoria: "venda nova", produto: "Aceleração", valor_pago: 7000, valor_venda: 30000, forma_pagamento: "PIX", canal: "LinkedIn" }),
  nota({ chave: "n6", mes: "2026-10", data_referencia: "2026-09-30", categoria: "mensalidade cliente", produto: "Tração", valor_pago: 4000, valor_venda: 8000, forma_pagamento: "PIX", canal: null }),
];

const DADO: RespostaFinanceiro = {
  periodo: { granularidade: "ano", inicio: "2026-01-01", fim: "2026-11-27" },
  notas: NOTAS,
};

vi.mock("../src/lib/api", () => ({
  buscarFinanceiro: vi.fn(async () => DADO),
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

  it("renderiza 5 cards, os 2 gráficos, o mês a mês e as 3 tabelas", async () => {
    montar();

    await waitFor(() => expect(screen.getByRole("region", { name: "Indicadores do período" })).toBeTruthy());
    const cards = within(screen.getByRole("region", { name: "Indicadores do período" }));
    for (const rotulo of ["Faturamento", "Receita líquida", "liquidado time comercial", "liquidado da base", "Acumulado do ano"]) {
      expect(cards.getByText(rotulo)).toBeTruthy();
    }
    for (const removido of ["Recebimento bruto", "Liquidou na conta", "Contrato bruto vendido", "Bruto vendido no ano", "Desempenho por closer"]) {
      expect(screen.queryByText(removido)).toBeNull();
    }
    expect(screen.queryByRole("region", { name: "No ano" })).toBeNull();

    expect(screen.getByText("Por canal")).toBeTruthy();
    expect(screen.getByText("Resultado mês a mês")).toBeTruthy();
    expect(screen.getByText("Como entrou o dinheiro")).toBeTruthy();
    expect(screen.getByText("Desempenho por produto")).toBeTruthy();

    // card + título do gráfico
    expect(screen.getAllByText("Faturamento").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Receita líquida").length).toBeGreaterThanOrEqual(2);
  });

  it("cards mostram os valores do mês", async () => {
    montar();

    await waitFor(() => expect(screen.getByRole("region", { name: "Indicadores do período" })).toBeTruthy());
    const cards = within(screen.getByRole("region", { name: "Indicadores do período" }));
    const card = (rotulo: string) => cards.getByText(rotulo).closest("article")!;

    const faturamento = within(card("Faturamento"));
    expect(faturamento.getByText(/R\$\s*88\.000,00/)).toBeTruthy();
    expect(faturamento.getByText(/ticket médio R\$\s*44\.000,00 · 2 vendas/)).toBeTruthy();

    expect(within(card("Receita líquida")).getByText(/R\$\s*20\.000,00/)).toBeTruthy();
    expect(within(card("liquidado time comercial")).getByText(/R\$\s*10\.000,00/)).toBeTruthy();
    expect(within(card("liquidado da base")).getByText(/R\$\s*8\.000,00/)).toBeTruthy();

    const acumulado = within(card("Acumulado do ano"));
    expect(acumulado.getByText(/R\$\s*118\.000,00/)).toBeTruthy();
    expect(acumulado.getByText(/receita líquida no ano R\$\s*31\.000,00/)).toBeTruthy();
  });

  it("em dia ou semana a receita mostra travessão com a legenda de só por mês", async () => {
    // Em dia/semana o período é sempre o corrente (ver `useFiltrosAtuais`), então fixa-se a data de hoje em 12/09.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 12, 12));
    montar("/?granularidade=dia&periodo=2026-09-12");

    await waitFor(() => expect(screen.getByRole("region", { name: "Indicadores do período" })).toBeTruthy());
    const cards = within(screen.getByRole("region", { name: "Indicadores do período" }));

    const cardFaturamento = cards.getByText("Faturamento").closest("article")!;
    expect(within(cardFaturamento).getByText(/^R\$\s*60\.000,00$/)).toBeTruthy();

    for (const rotulo of ["Receita líquida", "liquidado time comercial", "liquidado da base"]) {
      const card = cards.getByText(rotulo).closest("article")!;
      expect(within(card).getByText("—")).toBeTruthy();
    }
    expect(screen.getAllByText("Receita só por mês")).toHaveLength(3);

    const cabecalhos = screen.getAllByRole("columnheader", { name: "Receita líquida" });
    expect(cabecalhos.length).toBeGreaterThan(0);
    for (const cabecalho of cabecalhos) {
      const th = cabecalho as HTMLTableCellElement;
      const tabela = th.closest("table")!;
      const celulas = Array.from(tabela.querySelectorAll("tbody tr, tfoot tr")).map((tr) => tr.children[th.cellIndex]?.textContent);
      expect(celulas.length).toBeGreaterThan(0);
      expect(celulas.every((texto) => texto === "—")).toBe(true);
    }
  });

  it("tabelas: canal com % do faturamento, forma com Outros, produto só com os 4", async () => {
    montar("/?granularidade=mes&periodo=2026-09");

    await waitFor(() => expect(screen.getByText("Por canal")).toBeTruthy());

    const tabelaDe = (titulo: string) => within(screen.getByText(titulo).closest("article")!).getByRole("table");
    const linhasDe = (titulo: string) => Array.from(tabelaDe(titulo).querySelectorAll("tbody tr"));
    const linhaDe = (titulo: string, rotulo: string) => linhasDe(titulo).find((tr) => tr.children[0].textContent === rotulo)!;

    const linhaLinkedIn = linhaDe("Por canal", "LinkedIn");
    expect(linhaLinkedIn.textContent).toMatch(/R\$\s*60\.000,00/);
    expect(linhaLinkedIn.children[2].textContent).toBe("1");
    expect(linhaLinkedIn.children[3].textContent).toBe("68%");
    expect(linhaDe("Por canal", "Sem canal")).toBeTruthy();

    expect(linhaDe("Como entrou o dinheiro", "PIX").children[1].textContent).toMatch(/R\$\s*5\.000,00/);
    expect(linhaDe("Como entrou o dinheiro", "Cartão").children[1].textContent).toMatch(/R\$\s*10\.000,00/);
    expect(linhaDe("Como entrou o dinheiro", "Boleto").children[1].textContent).toMatch(/R\$\s*2\.000,00/);
    expect(linhaDe("Como entrou o dinheiro", "Outros").children[1].textContent).toMatch(/R\$\s*3\.000,00/);

    const rotulosProduto = linhasDe("Desempenho por produto").map((tr) => tr.children[0].textContent);
    expect(rotulosProduto).toEqual(["Ativação", "Tração", "Aceleração", "The Green House"]);
    expect(screen.queryByText("Sprint")).toBeNull();
  });
});
