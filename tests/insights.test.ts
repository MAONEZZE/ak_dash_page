import { describe, expect, it } from "vitest";
import { agregarConsolidado, agregarPorMetrica, serieAteHoje, serieDoTimePorMetrica } from "../src/lib/insights";
import type { Metrica, PessoaComercial } from "../src/lib/tipos-api";

function metrica(parcial: Partial<Metrica> & Pick<Metrica, "metrica" | "status">): Metrica {
  return {
    nome_exibicao: parcial.metrica,
    meta_periodo: 0,
    realizado: 0,
    dias_com_lacuna: 0,
    ...parcial,
  };
}

function pessoa(parcial: Partial<PessoaComercial>): PessoaComercial {
  return {
    id_user: "1",
    email: "a@teste.com",
    nome: null,
    metas_atingidas: { atingidas: 0, total: 0 },
    metricas: [],
    pontuacao_total: 0,
    posicao: 1,
    contas_origem: [],
    ...parcial,
  };
}

describe("agregarConsolidado", () => {
  it("sem_preenchimento não soma no realizado nem entra na média", () => {
    const pessoas = [
      pessoa({
        metricas: [
          metrica({ metrica: "a", status: "atingido", meta_periodo: 100, realizado: 100 }),
          metrica({ metrica: "b", status: "sem_preenchimento", meta_periodo: 100, realizado: 0 }),
        ],
      }),
    ];
    const consolidado = agregarConsolidado(pessoas);
    expect(consolidado.realizadoTotal).toBe(100);
    expect(consolidado.metaTotal).toBe(200);
    expect(consolidado.pctGeral).toBe(0.5);
  });

  it("atingido no limite exato conta como atingida", () => {
    const pessoas = [pessoa({ metricas: [metrica({ metrica: "a", status: "atingido", meta_periodo: 50, realizado: 50 })] })];
    const consolidado = agregarConsolidado(pessoas);
    expect(consolidado.contagemStatus.atingido).toBe(1);
    expect(consolidado.pctGeral).toBe(1);
  });

  it("metaTotal zero devolve pctGeral null, nunca NaN/Infinity", () => {
    const pessoas = [pessoa({ metricas: [metrica({ metrica: "a", status: "sem_preenchimento", meta_periodo: 0, realizado: 0 })] })];
    const consolidado = agregarConsolidado(pessoas);
    expect(consolidado.pctGeral).toBeNull();
    expect(Number.isNaN(consolidado.pctGeral)).toBe(false);
  });

  it("coberturaLancto null quando não há nenhuma métrica considerada", () => {
    const consolidado = agregarConsolidado([]);
    expect(consolidado.coberturaLancto).toBeNull();
    expect(consolidado.metaTotal).toBe(0);
  });

  it("mistura SDR+Closer produz união sem duplicar contagem", () => {
    const pessoas = [
      pessoa({
        email: "dupla@teste.com",
        metricas: [
          metrica({ metrica: "conexoes_enviadas", status: "atingido", meta_periodo: 10, realizado: 10 }),
          metrica({ metrica: "reunioes_realizadas", status: "abaixo_da_meta", meta_periodo: 5, realizado: 2 }),
        ],
      }),
    ];
    const consolidado = agregarConsolidado(pessoas);
    expect(consolidado.contagemStatus.atingido).toBe(1);
    expect(consolidado.contagemStatus.abaixo_da_meta).toBe(1);
    expect(consolidado.realizadoTotal).toBe(12);
  });

  it("sem_meta fica fora do metaTotal mas conta na contagem de status", () => {
    const pessoas = [
      pessoa({
        metricas: [
          metrica({ metrica: "indicacoes", status: "sem_meta", meta_periodo: null, realizado: 7 }),
          metrica({ metrica: "numeros_captados", status: "atingido", meta_periodo: 10, realizado: 10 }),
        ],
      }),
    ];
    const consolidado = agregarConsolidado(pessoas);
    expect(consolidado.metaTotal).toBe(10);
    expect(consolidado.realizadoTotal).toBe(17); // sem_meta ainda é dado real, entra no realizado
    expect(consolidado.contagemStatus.sem_meta).toBe(1);
    expect(consolidado.contagemStatus.atingido).toBe(1);
  });
});

describe("agregarPorMetrica", () => {
  it("soma meta e realizado do time por métrica, preservando dias_com_lacuna", () => {
    const pessoas = [
      pessoa({
        metricas: [metrica({ metrica: "x", nome_exibicao: "X", status: "atingido", meta_periodo: 100, realizado: 120, dias_com_lacuna: 2 })],
      }),
      pessoa({
        metricas: [metrica({ metrica: "x", nome_exibicao: "X", status: "abaixo_da_meta", meta_periodo: 100, realizado: 60, dias_com_lacuna: 5 })],
      }),
    ];
    const [x] = agregarPorMetrica(pessoas);
    expect(x.meta).toBe(200);
    expect(x.realizado).toBe(180);
    expect(x.diasComLacuna).toBe(7);
    expect(x.lancadas).toBe(2);
    expect(x.total).toBe(2);
  });

  it("sem_preenchimento não soma no realizado nem em lancadas", () => {
    const pessoas = [pessoa({ metricas: [metrica({ metrica: "x", status: "sem_preenchimento", meta_periodo: 100, realizado: 0 })] })];
    const [x] = agregarPorMetrica(pessoas);
    expect(x.realizado).toBe(0);
    expect(x.lancadas).toBe(0);
    expect(x.total).toBe(1);
    expect(x.pct).toBeNull();
  });

  it("pct null quando meta é zero, nunca NaN/Infinity", () => {
    const pessoas = [pessoa({ metricas: [metrica({ metrica: "x", status: "atingido", meta_periodo: 0, realizado: 5 })] })];
    const [x] = agregarPorMetrica(pessoas);
    expect(x.pct).toBeNull();
  });

  it("sem_meta não soma no meta (fica null), mas realizado continua contado", () => {
    const pessoas = [pessoa({ metricas: [metrica({ metrica: "indicacoes", status: "sem_meta", meta_periodo: null, realizado: 7 })] })];
    const [x] = agregarPorMetrica(pessoas);
    expect(x.meta).toBeNull();
    expect(x.realizado).toBe(7);
    expect(x.pct).toBeNull();
  });

  it("mistura SDR+Closer produz união sem duplicar entradas por métrica", () => {
    const pessoas = [
      pessoa({
        metricas: [
          metrica({ metrica: "conexoes_enviadas", status: "atingido", meta_periodo: 10, realizado: 10 }),
          metrica({ metrica: "reunioes_realizadas", status: "abaixo_da_meta", meta_periodo: 5, realizado: 2 }),
        ],
      }),
    ];
    const resultado = agregarPorMetrica(pessoas);
    expect(resultado).toHaveLength(2);
    expect(resultado.map((m) => m.metrica).sort()).toEqual(["conexoes_enviadas", "reunioes_realizadas"]);
  });
});

describe("serieDoTimePorMetrica", () => {
  it("extrai a série de uma métrica, zero quando ausente no dia", () => {
    const serie = [
      { dia: "2026-09-01", metricas: { x: 10 } },
      { dia: "2026-09-02", metricas: { y: 5 } },
    ];
    expect(serieDoTimePorMetrica(serie, "x")).toEqual([
      { dia: "2026-09-01", valor: 10 },
      { dia: "2026-09-02", valor: 0 },
    ]);
  });
});

describe("serieAteHoje", () => {
  it("corta os dias depois de hoje", () => {
    const serie = [
      { dia: "2026-09-01", valor: 10 },
      { dia: "2026-09-02", valor: 20 },
      { dia: "2026-09-03", valor: 0 },
      { dia: "2026-09-04", valor: 0 },
    ];
    expect(serieAteHoje(serie, "2026-09-02")).toEqual([
      { dia: "2026-09-01", valor: 10 },
      { dia: "2026-09-02", valor: 20 },
    ]);
  });

  it("fica vazia quando hoje é antes do primeiro dia da série", () => {
    const serie = [
      { dia: "2026-09-01", valor: 10 },
      { dia: "2026-09-02", valor: 20 },
    ];
    expect(serieAteHoje(serie, "2026-08-31")).toEqual([]);
  });
});
