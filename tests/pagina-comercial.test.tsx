// @vitest-environment jsdom
//
// Duas decisões de produto que só existem na página Comercial e que nenhum
// componente sozinho garante:
//
// 1. As 4 métricas de prospecção do LinkedIn (Conexões Enviadas/Aceitas,
//    Abordagens, InMails) não aparecem em lugar nenhum da página — nem nos
//    cards de cima, nem no seletor do gráfico, nem na lista do time.
// 2. O gráfico "Acompanhamento de metas" é fixo no MÊS CORRENTE: mesmo com a
//    pill em Dia/Semana/Ano, a série pedida ao BFF é a do mês.
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import { SomProvider } from "../src/lib/som";
import { Comercial } from "../src/paginas/Comercial";
import type { Metrica, ParametrosComercial, RespostaComercial } from "../src/lib/tipos-api";

function metrica(chave: string, nome: string, realizado: number): Metrica {
  return { metrica: chave, nome_exibicao: nome, meta_periodo: 10, realizado, status: "abaixo_da_meta", dias_com_lacuna: 0 };
}

const METRICAS_SDR: Metrica[] = [
  metrica("conexoes_enviadas", "Conexões Enviadas", 300),
  metrica("conexoes_aceitas", "Conexões Aceitas", 120),
  metrica("abordagens", "Abordagens", 90),
  metrica("in_mails", "InMails Enviados", 40),
  metrica("fups", "Follow-ups", 12),
  metrica("numeros_captados", "Números Captados", 8),
];

function resposta(pessoas: RespostaComercial["pessoas"]): RespostaComercial {
  return {
    periodo: { granularidade: "mes", inicio: "2026-09-01", fim: "2026-09-30" },
    periodo_parcial: true,
    avisos: [],
    pessoas,
    serie_diaria: [
      { dia: "2026-09-01", metricas: { fups: 1, numeros_captados: 2 } },
      { dia: "2026-09-02", metricas: { fups: 3, numeros_captados: 4 } },
    ],
  };
}

const chamadasSdr: ParametrosComercial[] = [];

vi.mock("../src/lib/api", () => ({
  buscarComercialSdr: vi.fn(async (params: ParametrosComercial) => {
    chamadasSdr.push(params);
    return resposta([
      {
        id_user: "9",
        email: "nathan@x.com",
        nome: "Nathan",
        imagem_url: "https://exemplo/foto.png",
        metas_atingidas: { atingidas: 0, total: 6 },
        metricas: METRICAS_SDR,
        pontuacao_total: 10,
        posicao: 1,
        contas_origem: [],
      },
    ]);
  }),
  buscarComercialCloser: vi.fn(async () => resposta([])),
}));

function montar(querystring: string) {
  return render(
    <MemoryRouter initialEntries={[querystring]}>
      <AtualizacaoProvider>
        <SomProvider>
          <Comercial />
        </SomProvider>
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  chamadasSdr.length = 0;
  cleanup();
});

describe("página Comercial", () => {
  it("não mostra as métricas de prospecção do LinkedIn em lugar nenhum", async () => {
    montar("/?granularidade=mes");
    await waitFor(() => expect(screen.getAllByText("Follow-ups").length).toBeGreaterThan(0));

    for (const oculta of ["Conexões Enviadas", "Conexões Aceitas", "Abordagens", "InMails Enviados"]) {
      expect(screen.queryAllByText(oculta)).toEqual([]);
    }
    // O que sobrou continua na tela, com o "x/y metas batidas" recontado só
    // em cima das métricas visíveis (2 de 6 sobraram).
    expect(screen.getAllByText("Números Captados").length).toBeGreaterThan(0);
    expect(screen.getByText(/0\/2 metas batidas/)).toBeTruthy();
  });

  it("cards de cima não repetem a tag SDR/CLOSER", async () => {
    montar("/?granularidade=mes");
    await waitFor(() => expect(screen.getAllByText("Follow-ups").length).toBeGreaterThan(0));

    expect(screen.queryAllByText("CLOSER")).toEqual([]);
    // "SDR ·" da lista do time continua — o que sai é a tag dos cards de KPI.
    expect(screen.queryAllByText("SDR")).toEqual([]);
  });

  it("gráfico pede a série do mês corrente mesmo com a pill em Dia", async () => {
    const mesCorrente = new Date().toISOString().slice(0, 7);
    montar("/?granularidade=dia");

    await waitFor(() => expect(chamadasSdr.some((c) => c.granularidade === "mes")).toBe(true));
    expect(chamadasSdr.some((c) => c.granularidade === "dia")).toBe(true);
    expect(chamadasSdr.find((c) => c.granularidade === "mes")?.periodo).toBe(mesCorrente);
  });

  it("sob o mês corrente não repete a busca só pro gráfico", async () => {
    const mesCorrente = new Date().toISOString().slice(0, 7);
    montar(`/?granularidade=mes&periodo=${mesCorrente}`);

    await waitFor(() => expect(chamadasSdr.length).toBeGreaterThan(0));
    expect(chamadasSdr).toHaveLength(1);
  });
});
