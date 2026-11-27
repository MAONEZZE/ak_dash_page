import { describe, expect, it } from "vitest";
import { acumuladoDoAno, agruparPorCanal, agruparPorForma, agruparPorProduto, mesesDoPeriodo, serieMensal, totaisDoPeriodo, totalDeLinhas, totalSerie } from "../src/lib/agregacoes-notas";
import type { NotaFinanceiro } from "../src/lib/tipos-api";

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

describe("totaisDoPeriodo", () => {
  it("totaisDoPeriodo soma faturamento pela data de referência e receita pelo mês da aba", () => {
    expect(totaisDoPeriodo(NOTAS, "2026-09-01", "2026-09-30")).toEqual({
      faturamento: 88000,
      vendas: 2,
      ticketMedio: 44000,
      receita: 20000,
      receitaComercial: 10000,
      receitaBase: 8000,
    });
    expect(totaisDoPeriodo([], "2026-09-01", "2026-09-30")).toEqual({
      faturamento: 0,
      vendas: 0,
      ticketMedio: null,
      receita: 0,
      receitaComercial: 0,
      receitaBase: 0,
    });
  });
});

describe("mesesDoPeriodo", () => {
  it("mesesDoPeriodo lista os meses tocados, cruzando a virada do ano", () => {
    expect(mesesDoPeriodo("2026-09-01", "2026-09-30")).toEqual(["2026-09"]);
    expect(mesesDoPeriodo("2025-11-20", "2026-02-03")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(mesesDoPeriodo("2026-10-28", "2026-10-28")).toEqual(["2026-10"]);
  });
});

describe("serieMensal", () => {
  it("serieMensal dá 12 meses com receita, faturamento, vendas e ticket, e o total recalcula o ticket", () => {
    const s = serieMensal(NOTAS, "2026");
    expect(s.length).toBe(12);
    expect(s[0]).toEqual({ mes: "2026-01", faturamento: 0, receita: 0, receitaComercial: 0, receitaBase: 0, vendas: 0, ticketMedio: null });
    expect(s[7]).toEqual({ mes: "2026-08", faturamento: 30000, receita: 7000, receitaComercial: 7000, receitaBase: 0, vendas: 1, ticketMedio: 30000 });
    expect(s[8]).toEqual({ mes: "2026-09", faturamento: 88000, receita: 20000, receitaComercial: 10000, receitaBase: 8000, vendas: 2, ticketMedio: 44000 });
    expect(s[9]).toEqual({ mes: "2026-10", faturamento: 0, receita: 4000, receitaComercial: 0, receitaBase: 4000, vendas: 0, ticketMedio: null });
    expect(totalSerie(s)).toEqual({ mes: "total", faturamento: 118000, receita: 31000, receitaComercial: 17000, receitaBase: 12000, vendas: 3, ticketMedio: 118000 / 3 });
    expect(acumuladoDoAno(NOTAS, "2026")).toEqual({ faturamento: 118000, receita: 31000 });
  });
});

describe("agruparPorCanal", () => {
  it("agruparPorCanal lista os canais fixos, anexa Sem canal e soma faturamento e vendas da data", () => {
    const linhas = agruparPorCanal(NOTAS, "2026-09-01", "2026-09-30");
    expect(linhas.map((l) => l.rotulo)).toEqual(["LinkedIn", "Indicação", "Instagram", "Evento", "Cliente", "Sem canal"]);
    expect(linhas.find((l) => l.rotulo === "LinkedIn")).toMatchObject({ vendas: 1, faturamento: 60000, receita: 0 });
    expect(linhas.find((l) => l.rotulo === "Indicação")).toMatchObject({ vendas: 1, faturamento: 20000, receita: 0 });
    expect(linhas.find((l) => l.rotulo === "Instagram")).toMatchObject({ vendas: 0, faturamento: 0, receita: 0 });
    expect(linhas.find((l) => l.rotulo === "Evento")).toMatchObject({ vendas: 0, faturamento: 0, receita: 0 });
    expect(linhas.find((l) => l.rotulo === "Cliente")).toMatchObject({ vendas: 0, faturamento: 0, receita: 0 });
    expect(linhas.find((l) => l.rotulo === "Sem canal")).toMatchObject({ vendas: 0, faturamento: 8000, receita: 0 });
    expect(totalDeLinhas(linhas)).toEqual({ chave: "__total__", rotulo: "Total", vendas: 2, faturamento: 88000, receita: 0 });
  });
});

describe("agruparPorForma", () => {
  it("agruparPorForma soma a receita do mês por forma e só mostra Outros com valor", () => {
    const setembro = agruparPorForma(NOTAS, "2026-09-01", "2026-09-30");
    expect(setembro.map((l) => l.rotulo)).toEqual(["PIX", "Cartão", "Boleto", "Outros"]);
    expect(setembro.map((l) => l.receita)).toEqual([5000, 10000, 2000, 3000]);
    expect(setembro.every((l) => l.vendas === 0 && l.faturamento === 0)).toBe(true);

    const agosto = agruparPorForma(NOTAS, "2026-08-01", "2026-08-31");
    expect(agosto.map((l) => l.rotulo)).toEqual(["PIX", "Cartão", "Boleto"]);
    expect(agosto.map((l) => l.receita)).toEqual([7000, 0, 0]);
  });
});

describe("agruparPorProduto", () => {
  it("agruparPorProduto mostra só Ativação, Tração, Aceleração e The Green House", () => {
    const linhas = agruparPorProduto(NOTAS, "2026-09-01", "2026-09-30");
    expect(linhas.map((l) => l.rotulo)).toEqual(["Ativação", "Tração", "Aceleração", "The Green House"]);
    expect(linhas.find((l) => l.rotulo === "Ativação")).toMatchObject({ vendas: 0, faturamento: 0, receita: 0 });
    expect(linhas.find((l) => l.rotulo === "Tração")).toMatchObject({ vendas: 0, faturamento: 8000, receita: 5000 });
    expect(linhas.find((l) => l.rotulo === "Aceleração")).toMatchObject({ vendas: 1, faturamento: 60000, receita: 10000 });
    expect(linhas.find((l) => l.rotulo === "The Green House")).toMatchObject({ vendas: 0, faturamento: 0, receita: 0 });
  });
});
