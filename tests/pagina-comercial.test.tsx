// @vitest-environment jsdom
//
// Página Comercial: um bloco de cards com ritmo por cargo (Sellers, SDRs e
// Closers, com as métricas da aba "Dashboard" de cada planilha),
// "Acompanhamento do mês" (gráfico + "Para bater a meta", sempre no mês
// corrente) e o "Time comercial" com uma tabela por cargo. O filtro de função
// (?squad=) esconde o que não se aplica. As 4 métricas do Dripify não aparecem
// em lugar nenhum.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtualizacaoProvider, useAtualizacao } from "../src/lib/atualizacao";
import { SomProvider } from "../src/lib/som";
import { Comercial } from "../src/paginas/Comercial";
import type { Metrica, MetricaTime, ParametrosComercial, PessoaComercial, RespostaComercial } from "../src/lib/tipos-api";

// O BFF manda todas as métricas do cargo; a página só mostra as da aba Dashboard.
const CHAVES_SELLER = ["fups", "numeros_captados", "indicacoes"];
const CHAVES_SDR = ["inscricoes_realizadas", "indicacoes", "reunioes_agendadas", "ligacoes_efetuadas", "ligacoes_realizadas"];
const CHAVES_CLOSER = ["reunioes_agendadas", "reunioes_realizadas", "indicacoes", "inscricoes_realizadas", "ligacoes_agendadas", "ligacoes_realizadas"];
const NOMES: Record<string, string> = {
  conexoes_enviadas: "Conexões Enviadas",
  conexoes_aceitas: "Conexões Aceitas",
  abordagens: "Abordagens",
  in_mails: "InMails Enviados",
  fups: "Follow-ups",
  numeros_captados: "Números Captados",
  ligacoes_realizadas: "Ligações Realizadas",
  reunioes_agendadas: "Reuniões Agendadas",
  indicacoes: "Indicações",
  inscricoes_realizadas: "Inscrições Realizadas",
  ligacoes_agendadas: "Ligações Agendadas",
  ligacoes_efetuadas: "Ligações Efetuadas",
  reunioes_realizadas: "Reuniões Realizadas",
};

/** Dia útil 10 de 20: "no ritmo" = pelo menos metade da meta. */
const DIAS_UTEIS = { decorridos: 10, total: 20 };

function pessoa(id: string, nome: string, email: string, chaves: string[], valores: [realizado: number, meta: number | null][]): PessoaComercial {
  const metricas: Metrica[] = chaves.map((chave, i) => {
    const [realizado, meta] = valores[i] ?? [0, null];
    return {
      metrica: chave,
      nome_exibicao: NOMES[chave],
      meta_periodo: meta,
      realizado,
      status: meta === null ? "sem_meta" : realizado >= meta ? "atingido" : "abaixo_da_meta",
      dias_com_lacuna: 0,
      pct_atingimento: null,
      falta_folga: null,
      horas_restantes: null,
      media_necessaria: null,
      previsao: null,
    };
  });
  return { id_user: id, email, nome, imagem_url: null, metas_atingidas: { atingidas: 0, total: 0 }, metricas, pontuacao_total: null, posicao: null, contas_origem: [] };
}

const seis = (realizado: number, meta: number | null): [number, number | null][] => Array.from({ length: 6 }, () => [realizado, meta]);

// Ordem esperada na tabela SDR (fração de metas no ritmo, nome no empate):
// Ana 6/6, Carla 1/1, Bia 2/3, Nathan 1/6. Zé não tem meta nenhuma.
function sdrsPadrao(): PessoaComercial[] {
  return [
    pessoa("9", "Nathan", "nathan@x.com", ["conexoes_enviadas", "abordagens", ...CHAVES_SDR], [[300, 10], [90, 10], [5, 10], ...seis(0, 10)]),
    pessoa("2", "Bia", "bia@x.com", CHAVES_SDR, [[10, 10], [10, 10], [0, 10], [0, null], [0, null], [0, null]]),
    pessoa("3", "Carla", "carla@x.com", CHAVES_SDR, [[10, 10], [0, null], [0, null], [0, null], [0, null], [0, null]]),
    pessoa("1", "Ana", "Ana.Silva@X.com", CHAVES_SDR, seis(10, 10)),
    pessoa("5", "Zé", "ze@x.com", CHAVES_SDR, seis(3, null)),
  ];
}

function closersPadrao(): PessoaComercial[] {
  return [
    pessoa("7", "Bruno", "bruno@x.com", CHAVES_CLOSER, seis(4, 10)),
    // Dupla função: mesmo email do SDR "Carla".
    pessoa("8", "Carla", "carla@x.com", CHAVES_CLOSER, seis(1, 10)),
  ];
}

let pessoasSeller: PessoaComercial[] = [];
let pessoasSdr: PessoaComercial[] = [];
let pessoasCloser: PessoaComercial[] = [];
let metricasTimeSdr: MetricaTime[] | null = null;
const chamadasSdr: ParametrosComercial[] = [];

/** Uma entrada por chave, na ordem da primeira ocorrência; meta só soma quem tem meta. */
function metricasTimeDe(pessoas: PessoaComercial[]): MetricaTime[] {
  const porChave = new Map<string, { realizado: number; metas: number[] }>();
  for (const pessoa of pessoas) {
    for (const m of pessoa.metricas) {
      const acumulado = porChave.get(m.metrica) ?? { realizado: 0, metas: [] };
      acumulado.realizado += m.realizado;
      if (m.meta_periodo !== null) acumulado.metas.push(m.meta_periodo);
      porChave.set(m.metrica, acumulado);
    }
  }
  return [...porChave].map(([chave, { realizado, metas }]) => ({
    metrica: chave,
    nome_exibicao: NOMES[chave],
    meta_periodo: metas.length > 0 ? metas.reduce((soma, meta) => soma + meta, 0) : null,
    realizado,
    pct_atingimento: null,
    falta_folga: null,
    horas_restantes: null,
    media_necessaria: null,
    previsao: null,
  }));
}

function resposta(pessoas: PessoaComercial[], metricasTime = metricasTimeDe(pessoas)): RespostaComercial {
  return {
    periodo: { granularidade: "mes", inicio: "2026-09-01", fim: "2026-09-30" },
    dias_uteis: DIAS_UTEIS,
    periodo_parcial: true,
    avisos: [],
    pessoas,
    metricas_time: metricasTime,
    serie_diaria: [
      { dia: "2026-09-01", metricas: { fups: 1, numeros_captados: 2 } },
      { dia: "2026-09-02", metricas: { fups: 3, numeros_captados: 4 } },
    ],
  };
}

vi.mock("../src/lib/api", () => ({
  buscarComercialSeller: vi.fn(async () => resposta(pessoasSeller)),
  buscarComercialSdr: vi.fn(async (params: ParametrosComercial) => {
    chamadasSdr.push(params);
    return resposta(pessoasSdr, metricasTimeSdr ?? metricasTimeDe(pessoasSdr));
  }),
  buscarComercialCloser: vi.fn(async () => resposta(pessoasCloser)),
}));

function Destino() {
  const { pathname, search, hash } = useLocation();
  return <p data-testid="destino">{`${pathname}${search}${hash}`}</p>;
}

function DiasNoCabecalho() {
  const { diasUteis } = useAtualizacao().valor;
  return <p data-testid="dias-uteis">{diasUteis ? `${diasUteis.decorridos} de ${diasUteis.total}` : "nenhum"}</p>;
}

function montar(querystring: string) {
  return render(
    <MemoryRouter initialEntries={[querystring]}>
      <AtualizacaoProvider>
        <SomProvider>
          <DiasNoCabecalho />
          <Routes>
            <Route path="/" element={<Comercial />} />
            <Route path="/time" element={<Destino />} />
          </Routes>
        </SomProvider>
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

async function carregada(querystring = "/?granularidade=mes") {
  const r = montar(querystring);
  await screen.findByRole("heading", { name: "Time comercial" });
  return r;
}

/** Nomes das linhas do corpo da tabela, na ordem. */
function nomesDasLinhas(tabela: HTMLElement): string[] {
  return within(tabela)
    .getAllByRole("row")
    .slice(1)
    // Último span da célula: o primeiro é a inicial do avatar sem foto.
    .map((linha) => within(linha).getAllByRole("cell")[0].querySelector("span:last-child")?.textContent ?? "");
}

beforeEach(() => {
  // Sem sellers por padrão: o gráfico abre na primeira métrica de SDR.
  pessoasSeller = [];
  pessoasSdr = sdrsPadrao();
  pessoasCloser = closersPadrao();
  metricasTimeSdr = null;
});

afterEach(() => {
  chamadasSdr.length = 0;
  cleanup();
});

describe("página Comercial", () => {
  it("título com a nota sobre a linha vertical da barra", async () => {
    await carregada();
    expect(screen.getByRole("heading", { level: 1, name: "Comercial" })).toBeTruthy();
    expect(screen.getByText("Linha vertical na barra = onde o time deveria estar hoje")).toBeTruthy();
  });

  it("não mostra as métricas de prospecção do LinkedIn em lugar nenhum", async () => {
    await carregada();
    for (const oculta of ["Conexões Enviadas", "Conexões Aceitas", "Abordagens", "InMails Enviados"]) {
      expect(screen.queryAllByText(oculta, { exact: false })).toEqual([]);
    }
  });

  it("um bloco de cards por cargo, com as métricas da aba Dashboard da planilha, somando o time", async () => {
    // Sem o Zé (sem meta nenhuma): com ele, a meta do time não fecha — ver o teste seguinte.
    pessoasSdr = sdrsPadrao().filter((p) => p.nome !== "Zé");
    await carregada();
    const sdrs = screen.getByRole("region", { name: "Prospecção · SDRs" });
    const closers = screen.getByRole("region", { name: "Fechamento · Closers" });

    expect(within(sdrs).getAllByRole("article")).toHaveLength(3);
    expect(within(closers).getAllByRole("article")).toHaveLength(4);
    expect(closers.textContent).toContain("Reuniões Realizadas");
    expect(closers.textContent).not.toContain("Ligações Agendadas");
    expect(sdrs.textContent).not.toContain("Ligações Efetuadas");
    // Inscrições do time SDR: 5 + 10 + 10 + 10 = 35, contra a soma das metas 10 × 4 = 40.
    const inscricoes = within(sdrs).getAllByRole("article")[0];
    expect(inscricoes.textContent).toContain("Inscrições Realizadas");
    expect(inscricoes.textContent).toContain("35");
    expect(inscricoes.textContent).toContain("/ 40");
    expect(within(inscricoes).getByRole("progressbar")).toBeTruthy();
  });

  it("card do time soma a meta de quem tem meta e o realizado de todo mundo", async () => {
    // Padrão: o Zé lança 3 inscrições e não tem meta — as 3 entram no realizado
    // (38) e a meta é a dos outros 4 (40). Decisão do usuário, 2026-10-05.
    await carregada();
    const inscricoes = within(screen.getByRole("region", { name: "Prospecção · SDRs" })).getAllByRole("article")[0];
    expect(inscricoes.textContent).toContain("38");
    expect(inscricoes.textContent).toContain("/ 40");
    expect(inscricoes.textContent).not.toContain("Nenhuma meta definida no período");
  });

  it("card do time usa realizado e meta de metricas_time do BFF", async () => {
    metricasTimeSdr = [
      { metrica: "inscricoes_realizadas", nome_exibicao: "Inscrições Realizadas", meta_periodo: 120, realizado: 99, pct_atingimento: null, falta_folga: null, horas_restantes: null, media_necessaria: null, previsao: null },
    ];
    await carregada();
    const inscricoes = within(screen.getByRole("region", { name: "Prospecção · SDRs" })).getAllByRole("article")[0];
    expect(inscricoes.textContent).toContain("Inscrições Realizadas");
    expect(inscricoes.textContent).toContain("99");
    expect(inscricoes.textContent).toContain("/ 120");
    expect(inscricoes.textContent).not.toContain("/ 40");
  });

  it("card sem meta em ninguém mostra a métrica aberta: valor / 0 e barra cheia", async () => {
    pessoasSdr = [pessoa("5", "Zé", "ze@x.com", CHAVES_SDR, seis(3, null))];
    await carregada();
    const sdrs = screen.getByRole("region", { name: "Prospecção · SDRs" });
    expect(within(sdrs).getAllByText("Métrica aberta · sem meta no período")).toHaveLength(3);
    expect(within(sdrs).getAllByText("/ 0")).toHaveLength(3);
    expect(within(sdrs).getAllByRole("progressbar")).toHaveLength(3);
  });

  it("filtro de função Seller mostra só o bloco e a tabela de Sellers, com as métricas da planilha", async () => {
    pessoasSeller = [pessoa("4", "Isaque", "isaque@x.com", CHAVES_SELLER, [[30, 50], [2, 3], [1, null]])];
    await carregada("/?granularidade=mes&squad=seller");
    const sellers = screen.getByRole("region", { name: "Captação · Sellers" });
    expect(within(sellers).getAllByRole("article")).toHaveLength(3);
    expect(sellers.textContent).toContain("Follow-ups");
    expect(sellers.textContent).toContain("Números Captados");
    expect(nomesDasLinhas(within(screen.getByRole("article", { name: "Sellers" })).getByRole("table"))).toEqual(["Isaque"]);
    expect(screen.queryByRole("region", { name: "Prospecção · SDRs" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Fechamento · Closers" })).toBeNull();
    expect(screen.queryByRole("article", { name: "SDRs" })).toBeNull();
  });

  it("sem filtro mostra os três cargos, na ordem do funil", async () => {
    await carregada();
    const regioes = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label")).filter((n) => n?.includes("·"));
    expect(regioes).toEqual(["Captação · Sellers", "Prospecção · SDRs", "Fechamento · Closers"]);
  });

  it("filtro de função SDR esconde o bloco e a tabela de Closers", async () => {
    await carregada("/?granularidade=mes&squad=sdr");
    expect(screen.getByRole("region", { name: "Prospecção · SDRs" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Fechamento · Closers" })).toBeNull();
    expect(screen.getByRole("article", { name: "SDRs" })).toBeTruthy();
    expect(screen.queryByRole("article", { name: "Closers" })).toBeNull();
  });

  it("filtro de função Closer esconde o bloco e a tabela de SDRs", async () => {
    await carregada("/?granularidade=mes&squad=closer");
    expect(screen.queryByRole("region", { name: "Prospecção · SDRs" })).toBeNull();
    expect(screen.getByRole("region", { name: "Fechamento · Closers" })).toBeTruthy();
    expect(screen.queryByRole("article", { name: "SDRs" })).toBeNull();
    expect(screen.getByRole("article", { name: "Closers" })).toBeTruthy();
  });

  it("não tem mais o gauge de atingimento", async () => {
    await carregada();
    expect(screen.queryByText(/atingimento da meta/i)).toBeNull();
  });

  it("publica os dias úteis do período pro cabeçalho", async () => {
    await carregada();
    await waitFor(() => expect(screen.getByTestId("dias-uteis").textContent).toBe("10 de 20"));
  });

  describe("tabelas do time", () => {
    it("ordena pela fração de metas no ritmo, com o nome no empate", async () => {
      await carregada();
      const tabela = within(screen.getByRole("article", { name: "SDRs" })).getByRole("table");
      // Quem não tem meta nenhuma (Zé) também vira linha, no fim.
      expect(nomesDasLinhas(tabela)).toEqual(["Ana", "Carla", "Bia", "Nathan", "Zé"]);
    });

    it("coluna Metas mostra quantas estão no ritmo e quantas foram batidas", async () => {
      await carregada();
      const tabela = within(screen.getByRole("article", { name: "SDRs" })).getByRole("table");
      const bia = within(tabela).getAllByRole("row")[3];
      expect(bia.textContent).toContain("2/3 no ritmo");
      expect(bia.textContent).toContain("2 batidas");
      // Métrica sem meta é aberta: "/ 0" e barra cheia, não some.
      const carla = within(tabela).getAllByRole("row")[2];
      expect(within(carla).getAllByText("/ 0")).toHaveLength(2);
    });

    it("quem não tem meta nenhuma aparece na tabela, sem rodapé de 'sem meta'", async () => {
      await carregada();
      const cartao = screen.getByRole("article", { name: "SDRs" });
      expect(nomesDasLinhas(within(cartao).getByRole("table"))).toContain("Zé");
      expect(within(cartao).queryByText(/Sem meta em/)).toBeNull();
    });

    it("dupla função aparece nas duas tabelas, cada uma com as métricas do cargo", async () => {
      await carregada();
      const closers = within(screen.getByRole("article", { name: "Closers" })).getByRole("table");
      expect(nomesDasLinhas(closers)).toContain("Carla");
      expect(within(closers).getByText("Reuniões Realizadas")).toBeTruthy();
      expect(within(closers).queryByText("Follow-ups")).toBeNull();
    });

    it("Enter na linha leva pra Time, no card da pessoa, mantendo a querystring", async () => {
      await carregada("/?granularidade=mes&squad=sdr");
      const tabela = within(screen.getByRole("article", { name: "SDRs" })).getByRole("table");
      const ana = within(tabela).getAllByRole("row")[1];
      expect(ana.getAttribute("tabindex")).toBe("0");

      fireEvent.keyDown(ana, { key: "Enter" });

      expect(screen.getByTestId("destino").textContent).toBe("/time?granularidade=mes&squad=sdr#pessoa-ana.silva@x.com");
    });
  });

  describe("Para bater a meta", () => {
    function painel() {
      return screen.getByRole("article", { name: "Para bater a meta" });
    }

    it("com a média acima do necessário, diz que a meta fecha", async () => {
      // Meta 100, 60 em 10 dias úteis: média 6; faltam 40 em 10 dias = 4 por dia.
      pessoasSdr = [pessoa("1", "Ana", "ana@x.com", CHAVES_SDR, [[60, 100]])];
      await carregada();
      expect(painel().textContent).toContain("4por dia útil");
      expect(painel().textContent).toContain("Média atual: 6 por dia útil. Mantendo esse ritmo, a meta fecha.");
      expect(within(painel()).getByText("Faltam").nextElementSibling?.textContent).toBe("40");
      expect(within(painel()).getByText("Dias úteis restantes").nextElementSibling?.textContent).toBe("10");
      expect(within(painel()).getByText("Projeção").nextElementSibling?.textContent).toBe("120 (120%)");
    });

    it("com a média abaixo do necessário, diz quanto acelerar", async () => {
      // Meta 100, 20 em 10 dias úteis: média 2; faltam 80 em 10 dias = 8 por dia (+300%).
      pessoasSdr = [pessoa("1", "Ana", "ana@x.com", CHAVES_SDR, [[20, 100]])];
      await carregada();
      expect(painel().textContent).toContain("Média atual: 2 por dia útil. É preciso acelerar 300% para fechar a meta.");
    });

    it("sem meta na métrica selecionada", async () => {
      pessoasSdr = [pessoa("1", "Ana", "ana@x.com", CHAVES_SDR, [[20, null]])];
      await carregada();
      expect(within(painel()).getByText("Nenhuma meta definida no período")).toBeTruthy();
    });
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
