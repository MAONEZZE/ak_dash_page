import { describe, expect, it } from "vitest";
import { agregarPorMetrica, resumoMetas, serieDoTimePorMetrica } from "../src/lib/insights";
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


describe("resumoMetas", () => {
  // Dia útil 10 de 20: no ritmo = pelo menos metade da meta.
  const DIAS = { decorridos: 10, total: 20 };
  const CHAVES = ["a", "b", "c", "d"];

  it("conta só métricas com meta: no ritmo pelo esperado de hoje, batida pela meta cheia", () => {
    const resumo = resumoMetas(
      [
        metrica({ metrica: "a", status: "atingido", meta_periodo: 100, realizado: 100 }), // batida e no ritmo
        metrica({ metrica: "b", status: "abaixo_da_meta", meta_periodo: 100, realizado: 60 }), // no ritmo, não batida
        metrica({ metrica: "c", status: "abaixo_da_meta", meta_periodo: 100, realizado: 10 }), // muito atrás
        metrica({ metrica: "d", status: "sem_meta", meta_periodo: null, realizado: 50 }), // fora do Y
      ],
      CHAVES,
      DIAS,
    );
    expect(resumo).toEqual({ comMeta: 3, noRitmo: 2, batidas: 1 });
  });

  it("meta 0 conta como sem meta", () => {
    const resumo = resumoMetas([metrica({ metrica: "a", status: "atingido", meta_periodo: 0, realizado: 5 })], CHAVES, DIAS);
    expect(resumo).toEqual({ comMeta: 0, noRitmo: 0, batidas: 0 });
  });

  it("ignora métricas que não são colunas do cargo", () => {
    const resumo = resumoMetas([metrica({ metrica: "conexoes_enviadas", status: "atingido", meta_periodo: 10, realizado: 10 })], CHAVES, DIAS);
    expect(resumo.comMeta).toBe(0);
  });
});
