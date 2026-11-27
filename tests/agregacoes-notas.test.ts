import { describe, expect, it } from "vitest";
import { mesesDoPeriodo, totaisDoPeriodo } from "../src/lib/agregacoes-notas";
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
