// @vitest-environment jsdom
//
// Página Comercial: dois blocos de cards com ritmo (SDRs e Closers),
// "Acompanhamento do mês" (gráfico + "Para bater a meta", sempre no mês
// corrente) e o "Time comercial" em duas tabelas. O filtro de função
// (?squad=) esconde o que não se aplica. As 4 métricas do Dripify não aparecem
// em lugar nenhum.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtualizacaoProvider, useAtualizacao } from "../src/lib/atualizacao";
import { SomProvider } from "../src/lib/som";
import { Comercial } from "../src/paginas/Comercial";
import type { Metrica, ParametrosComercial, PessoaComercial, RespostaComercial } from "../src/lib/tipos-api";

const CHAVES_SDR = ["fups", "numeros_captados", "ligacoes_realizadas", "reunioes_agendadas", "indicacoes", "inscricoes_realizadas"];
const CHAVES_CLOSER = ["ligacoes_agendadas", "ligacoes_realizadas", "reunioes_agendadas", "reunioes_realizadas", "indicacoes", "inscricoes_realizadas"];
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

let pessoasSdr: PessoaComercial[] = [];
let pessoasCloser: PessoaComercial[] = [];
const chamadasSdr: ParametrosComercial[] = [];

function resposta(pessoas: PessoaComercial[]): RespostaComercial {
  return {
    periodo: { granularidade: "mes", inicio: "2026-09-01", fim: "2026-09-30" },
    dias_uteis: DIAS_UTEIS,
    periodo_parcial: true,
    avisos: [],
    pessoas,
    serie_diaria: [
      { dia: "2026-09-01", metricas: { fups: 1, numeros_captados: 2 } },
      { dia: "2026-09-02", metricas: { fups: 3, numeros_captados: 4 } },
    ],
  };
}

vi.mock("../src/lib/api", () => ({
  buscarComercialSdr: vi.fn(async (params: ParametrosComercial) => {
    chamadasSdr.push(params);
    return resposta(pessoasSdr);
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
  pessoasSdr = sdrsPadrao();
  pessoasCloser = closersPadrao();
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

  it("um bloco de 6 cards para SDRs e outro para Closers, somando o time", async () => {
    // Sem o Zé (sem meta nenhuma): com ele, a meta do time não fecha — ver o teste seguinte.
    pessoasSdr = sdrsPadrao().filter((p) => p.nome !== "Zé");
    await carregada();
    const sdrs = screen.getByRole("region", { name: "Prospecção · SDRs" });
    const closers = screen.getByRole("region", { name: "Fechamento · Closers" });

    expect(within(sdrs).getAllByRole("article")).toHaveLength(6);
    expect(within(closers).getAllByRole("article")).toHaveLength(6);
    // Follow-ups do time SDR: 5 + 10 + 10 + 10 = 35, contra a soma das metas 10 × 4 = 40.
    const fups = within(sdrs).getAllByRole("article")[0];
    expect(fups.textContent).toContain("Follow-ups");
    expect(fups.textContent).toContain("35");
    expect(fups.textContent).toContain("/ 40");
    expect(within(fups).getByRole("progressbar")).toBeTruthy();
  });

  it("card com meta em só parte do time não compara o realizado de todos contra a meta de alguns", async () => {
    // Padrão: o Zé lança 3 follow-ups e não tem meta. Somar 38 de realizado
    // contra 40 de meta (só 4 pessoas) inflaria o ritmo do time.
    await carregada();
    const fups = within(screen.getByRole("region", { name: "Prospecção · SDRs" })).getAllByRole("article")[0];
    expect(fups.textContent).toContain("38");
    expect(fups.textContent).not.toContain("/ 40");
    expect(fups.textContent).toContain("Nenhuma meta definida no período");
  });

  it("card sem meta em ninguém diz que não há meta", async () => {
    pessoasSdr = [pessoa("5", "Zé", "ze@x.com", CHAVES_SDR, seis(3, null))];
    await carregada();
    const sdrs = screen.getByRole("region", { name: "Prospecção · SDRs" });
    expect(within(sdrs).getAllByText("Nenhuma meta definida no período")).toHaveLength(6);
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
      expect(nomesDasLinhas(tabela)).toEqual(["Ana", "Carla", "Bia", "Nathan"]);
    });

    it("coluna Metas mostra quantas estão no ritmo e quantas foram batidas", async () => {
      await carregada();
      const tabela = within(screen.getByRole("article", { name: "SDRs" })).getByRole("table");
      const bia = within(tabela).getAllByRole("row")[3];
      expect(bia.textContent).toContain("2/3 no ritmo");
      expect(bia.textContent).toContain("2 batidas");
      // Métrica sem meta vira chip "Sem meta", não "0 / —".
      expect(within(bia).getAllByText("Sem meta")).toHaveLength(3);
    });

    it("quem não tem meta nenhuma vai pro rodapé, sem linha", async () => {
      await carregada();
      const cartao = screen.getByRole("article", { name: "SDRs" });
      expect(within(cartao).getByText("Sem meta em setembro: Zé")).toBeTruthy();
      expect(nomesDasLinhas(within(cartao).getByRole("table"))).not.toContain("Zé");
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
