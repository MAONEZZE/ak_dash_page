import { expect, it } from "vitest";
import {
  escalaMetades,
  extremosPorColuna,
  serieGraficoContas,
  formatarTaxa,
  indiceGargalo,
  formatoFunil,
  largurasEtapas,
  mediaNumerosCaptados,
  somarContas,
  taxasInstagram,
  taxasLinkedin,
  umaCasa,
  type ColunaFunil,
  type LinhaFunil,
} from "../src/lib/funil";
import { METRICAS_CONTA, type ContaFunil, type MetricasConta } from "../src/lib/tipos-api";

function metricas(parcial: Partial<MetricasConta>): MetricasConta {
  const zeros = Object.fromEntries(METRICAS_CONTA.map((k) => [k, 0])) as MetricasConta;
  return { ...zeros, ...parcial };
}

it("somarContas soma todas as contas e filtra pela conta escolhida", () => {
  const contas: ContaFunil[] = [
    { id_conta: "1", nome: "Jacob", metricas: metricas({ conexoes_enviadas: 381, numeros_captados: 19 }) },
    { id_conta: "2", nome: "Jonathan", metricas: metricas({ conexoes_enviadas: 383, numeros_captados: 19 }) },
  ];

  const todas = somarContas(contas, null);
  const jonathan = somarContas(contas, "Jonathan");
  const inexistente = somarContas(contas, "Inexistente");

  expect(todas.conexoes_enviadas).toBe(764);
  expect(todas.numeros_captados).toBe(38);
  expect(jonathan.conexoes_enviadas).toBe(383);
  expect(jonathan.numeros_captados).toBe(19);
  expect(inexistente.conexoes_enviadas).toBe(764);
  expect(inexistente.numeros_captados).toBe(38);
  expect(Object.keys(todas).sort()).toEqual([...METRICAS_CONTA].sort());
});

it("somarContas soma o sem_conta só no consolidado", () => {
  const contas: ContaFunil[] = [
    { id_conta: "1", nome: "Jacob", metricas: metricas({ numeros_captados: 19 }) },
    { id_conta: "2", nome: "Jonathan", metricas: metricas({ numeros_captados: 5 }) },
  ];
  const semConta = metricas({ numeros_captados: 3, abordagens: 2 });

  const todas = somarContas(contas, null, semConta);
  const jonathan = somarContas(contas, "Jonathan", semConta);
  const inexistente = somarContas(contas, "Inexistente", semConta);
  const semParametro = somarContas(contas, null);

  expect(todas.numeros_captados).toBe(27);
  expect(todas.abordagens).toBe(2);
  expect(jonathan.numeros_captados).toBe(5);
  expect(jonathan.abordagens).toBe(0);
  expect(inexistente.numeros_captados).toBe(27);
  expect(semParametro.numeros_captados).toBe(24);
});

it("taxasLinkedin bate com o painel da planilha e devolve null em divisão por zero", () => {
  const totais = metricas({
    conexoes_enviadas: 1621,
    conexoes_aceitas: 940,
    mensagens_abordagem: 840,
    follows_abordagem: 713,
    respondidos: 482,
    numeros_captados: 89,
  });
  const zeros = metricas({});

  const t = taxasLinkedin(totais);

  expect(formatarTaxa(t.aceitacao)).toBe("58,0%");
  expect(formatarTaxa(t.abordados)).toBe("89,4%");
  expect(formatarTaxa(t.resposta)).toBe("57,4%");
  expect(formatarTaxa(t.conversaoNumero)).toBe("18,5%");
  expect(formatarTaxa(t.conversaoTotal)).toBe("5,5%");
  expect(umaCasa(t.followsPorAbordagem)).toBe("0,8");

  const z = taxasLinkedin(zeros);

  expect(z.aceitacao).toBeNull();
  expect(z.abordados).toBeNull();
  expect(z.resposta).toBeNull();
  expect(z.conversaoNumero).toBeNull();
  expect(z.conversaoTotal).toBeNull();
  expect(z.followsPorAbordagem).toBeNull();
  expect(formatarTaxa(null)).toBe("—");
  expect(umaCasa(null)).toBe("—");
});

it("taxasInstagram calcula resposta, conversão e follow-ups por abordagem", () => {
  const m = metricas({ abordagens: 200, respondidos: 50, numeros_captados: 10, fups: 300 });

  const t = taxasInstagram(m);

  expect(t).toEqual({ resposta: 0.25, conversaoNumero: 0.2, conversaoTotal: 0.05, fupsPorAbordagem: 1.5 });

  const z = taxasInstagram(metricas({ respondidos: 5, numeros_captados: 2, fups: 3 }));

  expect(z.resposta).toBeNull();
  expect(z.conversaoTotal).toBeNull();
  expect(z.fupsPorAbordagem).toBeNull();
});

it("largurasEtapas é proporcional ao maior valor, com piso de 8%", () => {
  expect(largurasEtapas([1621, 940, 840, 482, 89])).toEqual([100, 58, 51.8, 29.7, 8]);
  expect(largurasEtapas([200, 50, 10])).toEqual([100, 25, 8]);
  expect(largurasEtapas([0, 0, 0])).toEqual([8, 8, 8]);
  expect(largurasEtapas([100, -9])).toEqual([100, 8]);
  expect(largurasEtapas([])).toEqual([]);
});

it("indiceGargalo devolve o índice da menor taxa válida", () => {
  expect(indiceGargalo([0.58, 0.894, 0.574, 0.185, null])).toBe(3);
  expect(indiceGargalo([0.2, 0.2, null])).toBe(0);
  expect(indiceGargalo([null, 0.3, null, 0.1])).toBe(3);
  expect(indiceGargalo([0.5, null])).toBeNull();
  expect(indiceGargalo([null, null])).toBeNull();
  expect(indiceGargalo([])).toBeNull();
});

it("extremosPorColuna aponta melhor e pior conta só nas colunas de taxa com valores distintos", () => {
  const colunas: ColunaFunil[] = [
    { chave: "enviadas", rotulo: "Enviadas", tipo: "numero" },
    { chave: "aceitacao", rotulo: "% Aceitação", tipo: "taxa" },
    { chave: "resposta", rotulo: "% Resposta", tipo: "taxa" },
    { chave: "conversao", rotulo: "Conversão", tipo: "taxa" },
  ];
  const linhas: LinhaFunil[] = [
    { nome: "Jacob", valores: { enviadas: 381, aceitacao: 0.664, resposta: 0.5, conversao: 0.05 } },
    { nome: "Alex", valores: { enviadas: 165, aceitacao: null, resposta: 0.5, conversao: null } },
    { nome: "Leticia", valores: { enviadas: 395, aceitacao: 0.549, resposta: 0.5, conversao: null } },
  ];

  expect(extremosPorColuna(colunas, linhas)).toEqual({ aceitacao: { melhor: "Jacob", pior: "Leticia" } });
});

it("formatoFunil estreita de 100% até 34% em passos iguais, um par topo/base por etapa", () => {
  expect(formatoFunil(3)).toEqual([
    [100, 78],
    [78, 56],
    [56, 34],
  ]);
  expect(formatoFunil(5).map(([topo]) => topo)).toEqual([100, 86.8, 73.6, 60.4, 47.2]);
  expect(formatoFunil(5)[4][1]).toBe(34);
  expect(formatoFunil(1)).toEqual([[100, 34]]);
  expect(formatoFunil(0)).toEqual([]);
});

function conta(nome: string, dias: [string, Partial<MetricasConta>][]): ContaFunil {
  const zero = Object.fromEntries(METRICAS_CONTA.map((m) => [m, 0])) as MetricasConta;
  return {
    id_conta: nome,
    nome,
    metricas: zero,
    serie: dias.map(([data, m]) => ({ data, metricas: { ...zero, ...m } })),
  };
}

it("serieGraficoContas: um ponto por dia do período até hoje, 0 nos dias sem registro", () => {
  const contas = [
    conta("Jacob", [["2026-11-02", { numeros_captados: 3 }], ["2026-11-04", { numeros_captados: 5 }]]),
    conta("Alex", [["2026-11-03", { numeros_captados: 1 }]]),
  ];

  const grafico = serieGraficoContas(
    contas,
    "numeros_captados",
    { granularidade: "mes", inicio: "2026-11-01", fim: "2026-11-30" },
    new Date(2026, 10, 4, 15),
  );

  expect(grafico.rotulos).toEqual(["01/11", "02/11", "03/11", "04/11"]);
  expect(grafico.series).toEqual([
    { nome: "Jacob", valores: [0, 3, 0, 5] },
    { nome: "Alex", valores: [0, 0, 1, 0] },
  ]);
});

it("serieGraficoContas: semana e custom passado mostram todos os dias do período", () => {
  const contas = [conta("Jacob", [["2026-10-30", { fups: 2 }]])];
  const hoje = new Date(2026, 10, 14);

  expect(serieGraficoContas(contas, "fups", { granularidade: "custom", inicio: "2026-10-29", fim: "2026-11-01" }, hoje)).toEqual({
    rotulos: ["29/10", "30/10", "31/10", "01/11"],
    series: [{ nome: "Jacob", valores: [0, 2, 0, 0] }],
  });
});

it("serieGraficoContas: no filtro de dia mostra os 7 dias até ele, pra ter linha", () => {
  const contas = [conta("Jacob", [["2026-10-28", { fups: 4 }], ["2026-11-02", { fups: 1 }]])];
  expect(
    serieGraficoContas(contas, "fups", { granularidade: "dia", inicio: "2026-11-02", fim: "2026-11-02" }, new Date(2026, 10, 14)),
  ).toEqual({
    rotulos: ["27/10", "28/10", "29/10", "30/10", "31/10", "01/11", "02/11"],
    series: [{ nome: "Jacob", valores: [0, 4, 0, 0, 0, 0, 1] }],
  });
});

it("serieGraficoContas: no filtro de semana mostra os 7 dias até hoje, mesmo na segunda-feira", () => {
  const contas = [conta("Jacob", [["2026-11-18", { fups: 2 }], ["2026-11-23", { fups: 5 }]])];
  const semana = { granularidade: "semana" as const, inicio: "2026-11-23", fim: "2026-11-29" };

  expect(serieGraficoContas(contas, "fups", semana, new Date(2026, 10, 23, 15))).toEqual({
    rotulos: ["17/11", "18/11", "19/11", "20/11", "21/11", "22/11", "23/11"],
    series: [{ nome: "Jacob", valores: [0, 2, 0, 0, 0, 0, 5] }],
  });
});

it("serieGraficoContas: semana passada mostra os 7 dias dela", () => {
  const contas = [conta("Jacob", [["2026-11-18", { fups: 2 }]])];
  const semana = { granularidade: "semana" as const, inicio: "2026-11-16", fim: "2026-11-22" };

  expect(serieGraficoContas(contas, "fups", semana, new Date(2026, 10, 23)).rotulos).toEqual([
    "16/11", "17/11", "18/11", "19/11", "20/11", "21/11", "22/11",
  ]);
});

it("serieGraficoContas: ano soma por mês, até o mês corrente", () => {
  const contas = [
    conta("Jacob", [
      ["2026-01-05", { abordagens: 4 }],
      ["2026-01-20", { abordagens: 6 }],
      ["2026-03-01", { abordagens: 1 }],
    ]),
  ];

  const grafico = serieGraficoContas(
    contas,
    "abordagens",
    { granularidade: "ano", inicio: "2026-01-01", fim: "2026-12-31" },
    new Date(2026, 2, 10),
  );

  expect(grafico.rotulos).toEqual(["Jan", "Fev", "Mar"]);
  expect(grafico.series[0].valores).toEqual([10, 0, 1]);

  const anoPassado = serieGraficoContas(contas, "abordagens", { granularidade: "ano", inicio: "2025-01-01", fim: "2025-12-31" }, new Date(2026, 2, 10));
  expect(anoPassado.rotulos).toHaveLength(12);
});

it("escalaMetades: 0, metade e o total, com total par pra metade ser inteira", () => {
  expect(escalaMetades([3, 100, 40])).toEqual([0, 50, 100]);
  expect(escalaMetades([7])).toEqual([0, 4, 8]);
  expect(escalaMetades([0, 0])).toEqual([0, 1, 2]);
  expect(escalaMetades([])).toEqual([0, 1, 2]);
});

it("mediaNumerosCaptados no mês em andamento divide pelos dias já passados, contando hoje", () => {
  expect(
    mediaNumerosCaptados(50, { granularidade: "mes", inicio: "2026-11-01", fim: "2026-11-30" }, new Date(2026, 10, 25, 14, 30)),
  ).toEqual({ valor: 2, unidade: "dia" });
});

it("mediaNumerosCaptados em período fechado divide por todos os dias do período", () => {
  expect(
    mediaNumerosCaptados(62, { granularidade: "mes", inicio: "2026-10-01", fim: "2026-10-31" }, new Date(2026, 10, 25, 14, 30)),
  ).toEqual({ valor: 2, unidade: "dia" });
});

it("mediaNumerosCaptados no filtro dia divide pelas horas passadas desde 00h", () => {
  expect(
    mediaNumerosCaptados(29, { granularidade: "dia", inicio: "2026-11-25", fim: "2026-11-25" }, new Date(2026, 10, 25, 14, 30)),
  ).toEqual({ valor: 2, unidade: "hora" });
});

it("mediaNumerosCaptados antes de 01h divide por 1 hora", () => {
  expect(
    mediaNumerosCaptados(3, { granularidade: "dia", inicio: "2026-11-25", fim: "2026-11-25" }, new Date(2026, 10, 25, 0, 20)),
  ).toEqual({ valor: 3, unidade: "hora" });
});
