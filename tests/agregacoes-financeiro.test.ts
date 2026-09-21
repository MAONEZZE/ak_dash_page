import { describe, expect, it } from "vitest";
import {
  agruparPor,
  agruparPorFormaPagamento,
  CANAIS_CANONICOS,
  chaveCanal,
  chaveCloser,
  chaveMetodoPagamento,
  METODOS_PAGAMENTO_CANONICOS,
  serieMensal,
  tetoElastico,
  totaisDoPeriodo,
  totalDeLinhas,
  totalYtd,
} from "../src/lib/agregacoes-financeiro";
import type { VendaFinanceiro } from "../src/lib/tipos-api";

function venda(over: Partial<VendaFinanceiro>): VendaFinanceiro {
  return {
    id: 1,
    data_venda: "2026-08-05T00:00:00",
    cliente: null,
    produto: null,
    canal: null,
    metodo_pagamento: null,
    num_parcelas: null,
    valor_bruto_contrato: 0,
    valor_entrada: 0,
    liquido_entrada: 0,
    imposto: 0.1,
    taxa: 0,
    valor_pgto_2: 0,
    taxa_pgto_2: 0,
    liquido_pgto_2: 0,
    forma_pgto_2: null,
    user_closer: null,
    closer: null,
    ...over,
  };
}

describe("agruparPor", () => {
  it("lista canônica sai sempre na frente, mesmo zerada", () => {
    const vendas = [venda({ canal: "LinkedIn", valor_bruto_contrato: 1000 })];
    const linhas = agruparPor(vendas, chaveCanal, CANAIS_CANONICOS);

    expect(linhas.map((l) => l.chave)).toEqual(CANAIS_CANONICOS.map((c) => c.chave));
    const dripify = linhas.find((l) => l.chave === "Dripify")!;
    expect(dripify.vendas).toBe(0);
    expect(dripify.bruto).toBe(0);
    const linkedin = linhas.find((l) => l.chave === "LinkedIn")!;
    expect(linkedin.vendas).toBe(1);
    expect(linkedin.bruto).toBe(1000);
  });

  it("valor desconhecido (fora da lista canônica) é anexado no fim", () => {
    const vendas = [venda({ canal: "Grafia Nova", valor_bruto_contrato: 500 })];
    const linhas = agruparPor(vendas, chaveCanal, CANAIS_CANONICOS);

    expect(linhas).toHaveLength(CANAIS_CANONICOS.length + 1);
    expect(linhas.at(-1)!.chave).toBe("Grafia Nova");
    expect(linhas.at(-1)!.bruto).toBe(500);
  });

  it("metodo_pagamento vazio vira 'Não informado' — cai na linha canônica, não vira extra", () => {
    const vendas = [venda({ metodo_pagamento: "", valor_entrada: 100 })];
    const linhas = agruparPor(vendas, chaveMetodoPagamento, METODOS_PAGAMENTO_CANONICOS);

    expect(linhas).toHaveLength(METODOS_PAGAMENTO_CANONICOS.length);
    const naoInformado = linhas.find((l) => l.chave === "Não informado")!;
    expect(naoInformado.vendas).toBe(1);
    expect(naoInformado.pago).toBe(100);
  });

  it("closer NULL vira 'Sem closer definido', anexado no fim (closer não está entre os ativos)", () => {
    const canonicos = [{ chave: "1", rotulo: "Jacob" }];
    const vendas = [venda({ user_closer: null })];
    const linhas = agruparPor(vendas, chaveCloser, canonicos);

    expect(linhas.at(-1)!.chave).toBe("__sem_closer__");
    expect(linhas.at(-1)!.rotulo).toBe("Sem closer definido");
  });

  it("closer inativo com venda (fora da lista de ativos) aparece anexado no fim, pelo id", () => {
    // Mariana (id 5) está inativa — não entra na lista canônica (só ativos) — mas vendeu.
    const canonicos = [{ chave: "1", rotulo: "Jacob" }];
    const vendas = [venda({ user_closer: 5, closer: "Mariana", valor_bruto_contrato: 900 })];
    const linhas = agruparPor(vendas, chaveCloser, canonicos);

    expect(linhas).toHaveLength(2);
    expect(linhas.at(-1)!.chave).toBe("5");
    expect(linhas.at(-1)!.rotulo).toBe("Mariana");
  });

  it("agrupa por user_closer (id), não por nome — dois ids com o mesmo nome ficam em linhas separadas", () => {
    const canonicos = [
      { chave: "2", rotulo: "Jonathan" },
      { chave: "10", rotulo: "Jonathan" },
    ];
    const vendas = [
      venda({ user_closer: 2, closer: "Jonathan", valor_bruto_contrato: 100 }),
      venda({ user_closer: 10, closer: "Jonathan", valor_bruto_contrato: 200 }),
    ];
    const linhas = agruparPor(vendas, chaveCloser, canonicos);

    expect(linhas).toHaveLength(2);
    expect(linhas.find((l) => l.chave === "2")!.bruto).toBe(100);
    expect(linhas.find((l) => l.chave === "10")!.bruto).toBe(200);
  });
});

describe("segundo pagamento (valor_pgto_2/taxa_pgto_2/liquido_pgto_2/forma_pgto_2)", () => {
  it("agruparPor (canal/closer/produto) soma pago e líquido dos DOIS pagamentos da mesma venda", () => {
    const vendas = [
      venda({
        canal: "LinkedIn",
        valor_entrada: 30000,
        liquido_entrada: 27000,
        valor_pgto_2: 30000,
        taxa_pgto_2: 0.1949,
        liquido_pgto_2: 21737.7,
        forma_pgto_2: "Cartão",
      }),
    ];
    const [linha] = agruparPor(vendas, chaveCanal, [{ chave: "LinkedIn", rotulo: "LinkedIn" }]);

    expect(linha.pago).toBe(60000);
    expect(linha.liquido).toBeCloseTo(48737.7, 2);
  });

  it("agruparPor sem segundo pagamento não muda (valor_pgto_2/liquido_pgto_2 zerados)", () => {
    const vendas = [venda({ canal: "LinkedIn", valor_entrada: 1000, liquido_entrada: 900 })];
    const [linha] = agruparPor(vendas, chaveCanal, [{ chave: "LinkedIn", rotulo: "LinkedIn" }]);

    expect(linha.pago).toBe(1000);
    expect(linha.liquido).toBe(900);
  });

  it("totaisDoPeriodo (cards Pago/Líquido) também soma os dois pagamentos", () => {
    const vendas = [venda({ valor_entrada: 30000, liquido_entrada: 27000, valor_pgto_2: 30000, liquido_pgto_2: 21737.7 })];
    const totais = totaisDoPeriodo(vendas);

    expect(totais.pago).toBe(60000);
    expect(totais.liquido).toBeCloseTo(48737.7, 2);
  });

  it("serieMensal soma os dois pagamentos no mês da venda", () => {
    const vendas = [
      venda({ data_venda: "2026-03-10T00:00:00", valor_entrada: 30000, liquido_entrada: 27000, valor_pgto_2: 30000, liquido_pgto_2: 21737.7 }),
    ];
    const serie = serieMensal(vendas, "2026");

    expect(serie[2].mes).toBe("2026-03");
    expect(serie[2].pago).toBe(60000);
    expect(serie[2].liquido).toBeCloseTo(48737.7, 2);
  });

  describe("agruparPorFormaPagamento — 'Como entrou o dinheiro'", () => {
    it("uma venda com um só pagamento vira uma única linha, igual agruparPor", () => {
      const vendas = [venda({ metodo_pagamento: "PIX", valor_entrada: 100, imposto: 0.1, taxa: 0, liquido_entrada: 90 })];
      const linhas = agruparPorFormaPagamento(vendas, METODOS_PAGAMENTO_CANONICOS);

      const pix = linhas.find((l) => l.chave === "PIX")!;
      expect(pix.pago).toBe(100);
      expect(pix.liquido).toBe(90);
      expect(linhas.reduce((acc, l) => acc + l.vendas, 0)).toBe(1);
    });

    it("uma venda com forma_pgto_2 DIFERENTE de metodo_pagamento vira DUAS linhas — uma por forma", () => {
      const vendas = [
        venda({
          metodo_pagamento: "PIX",
          valor_entrada: 30000,
          imposto: 0.1,
          taxa: 0,
          liquido_entrada: 27000,
          forma_pgto_2: "Cartão",
          valor_pgto_2: 30000,
          taxa_pgto_2: 0.1949,
          liquido_pgto_2: 21737.7,
        }),
      ];
      const linhas = agruparPorFormaPagamento(vendas, METODOS_PAGAMENTO_CANONICOS);

      const pix = linhas.find((l) => l.chave === "PIX")!;
      const cartao = linhas.find((l) => l.chave === "Cartão")!;
      expect(pix.pago).toBe(30000);
      expect(pix.liquido).toBe(27000);
      expect(cartao.pago).toBe(30000);
      expect(cartao.liquido).toBeCloseTo(21737.7, 2);

      // Reconciliação por linha: Pago − Imposto − Taxa = Líquido, nas duas.
      expect(pix.pago - pix.imposto - pix.taxa).toBeCloseTo(pix.liquido, 2);
      expect(cartao.pago - cartao.imposto - cartao.taxa).toBeCloseTo(cartao.liquido, 2);

      // A soma das duas linhas fecha com o total combinado da venda (mesmo que agruparPor daria numa tabela por canal/closer/produto).
      const [linhaCombinada] = agruparPor(vendas, () => ({ chave: "x", rotulo: "x" }), []);
      expect(pix.pago + cartao.pago).toBe(linhaCombinada.pago);
      expect(pix.liquido + cartao.liquido).toBeCloseTo(linhaCombinada.liquido, 2);
    });

    it("forma_pgto_2 vazia/ausente com valor_pgto_2 > 0 vira 'Não informado'", () => {
      const vendas = [venda({ metodo_pagamento: "PIX", valor_entrada: 100, valor_pgto_2: 50, forma_pgto_2: null })];
      const linhas = agruparPorFormaPagamento(vendas, METODOS_PAGAMENTO_CANONICOS);

      const naoInformado = linhas.find((l) => l.chave === "Não informado")!;
      expect(naoInformado.pago).toBe(50);
    });

    it("sem segundo pagamento (valor_pgto_2 = 0), gera só a linha do metodo_pagamento", () => {
      const vendas = [venda({ metodo_pagamento: "PIX", valor_entrada: 100, valor_pgto_2: 0 })];
      const linhas = agruparPorFormaPagamento(vendas, METODOS_PAGAMENTO_CANONICOS);

      expect(linhas.reduce((acc, l) => acc + l.vendas, 0)).toBe(1);
    });
  });
});

describe("totalDeLinhas", () => {
  it("a linha de total fecha com a soma bruta das vendas do período (mesmo número dos cards)", () => {
    const vendas = [
      venda({ canal: "LinkedIn", valor_bruto_contrato: 300000 }),
      venda({ canal: "Instagram", valor_bruto_contrato: 630000 }),
    ];
    const linhas = agruparPor(vendas, chaveCanal, CANAIS_CANONICOS);
    const total = totalDeLinhas(linhas);

    expect(total.bruto).toBe(930000);
    expect(total.vendas).toBe(2);
    expect(total.bruto).toBe(totaisDoPeriodo(vendas).vendido);
  });

  it("ticket médio é recalculado sobre o total, não a soma dos tickets médios das linhas", () => {
    const canonicos = [
      { chave: "a", rotulo: "A" },
      { chave: "b", rotulo: "B" },
    ];
    const vendas = [
      venda({ produto: "a", valor_bruto_contrato: 1000 }),
      venda({ produto: "a", valor_bruto_contrato: 3000 }), // ticket médio de A = 2000
      venda({ produto: "b", valor_bruto_contrato: 100 }), // ticket médio de B = 100
    ];
    const linhas = agruparPor(vendas, (v) => ({ chave: v.produto!, rotulo: v.produto! }), canonicos);
    const total = totalDeLinhas(linhas);

    const somaDosTicketsMedios = linhas.reduce((acc, l) => acc + (l.vendas > 0 ? l.bruto / l.vendas : 0), 0);
    const ticketMedioTotal = total.bruto / total.vendas;

    expect(ticketMedioTotal).toBeCloseTo(1366.67, 1);
    expect(ticketMedioTotal).not.toBeCloseTo(somaDosTicketsMedios, 1);
  });
});

describe("imposto/taxa", () => {
  it("Pago − Imposto − Taxa fecha com o Líquido — número real do banco (taxa 0,1949)", () => {
    const v = venda({ valor_entrada: 60000, imposto: 0.1, taxa: 0.1949, liquido_entrada: 43475.4 });
    const [linha] = agruparPor([v], () => ({ chave: "x", rotulo: "x" }), []);

    expect(linha.pago - linha.imposto - linha.taxa).toBeCloseTo(v.liquido_entrada, 2);
  });
});

describe("totalYtd", () => {
  it("soma valor_bruto_contrato de jan até a data `ate`, inclusive", () => {
    const vendas = [
      venda({ data_venda: "2026-02-10T00:00:00", valor_bruto_contrato: 100 }),
      venda({ data_venda: "2026-05-31T00:00:00", valor_bruto_contrato: 200 }),
      venda({ data_venda: "2026-06-01T00:00:00", valor_bruto_contrato: 400 }), // depois do corte
    ];
    expect(totalYtd(vendas, "2026-05-31")).toBe(300);
  });
});

describe("serieMensal", () => {
  it("meses sem venda (set–dez/2026, que não existem no banco) saem zerados, não ausentes", () => {
    const vendas = [venda({ data_venda: "2026-01-15T00:00:00", valor_bruto_contrato: 1000 })];
    const serie = serieMensal(vendas, "2026");

    expect(serie).toHaveLength(12);
    expect(serie[0].mes).toBe("2026-01");
    expect(serie[0].vendido).toBe(1000);
    for (const ponto of serie.slice(8)) {
      // set (índice 8) a dez (índice 11)
      expect(ponto.vendido).toBe(0);
      expect(ponto.pago).toBe(0);
      expect(ponto.liquido).toBe(0);
    }
  });
});

describe("tetoElastico", () => {
  it("usa o piso quando nenhum valor o ultrapassa", () => {
    expect(tetoElastico([100_000, 250_000], 1_000_000, 250_000)).toBe(1_000_000);
  });

  it("sobe pro próximo múltiplo quando algum valor ultrapassa o piso", () => {
    expect(tetoElastico([1_100_000], 1_000_000, 250_000)).toBe(1_250_000);
  });

  it("nunca fica abaixo de zero com série vazia/toda zerada", () => {
    expect(tetoElastico([], 300_000, 100_000)).toBe(300_000);
  });
});
