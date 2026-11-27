// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { buscarFunilSdr } from "../src/lib/api";
import { AtualizacaoProvider } from "../src/lib/atualizacao";
import type { MetricaTime, MetricasSdrFunil, RespostaFunilSdr } from "../src/lib/tipos-api";
import { FunilSdr } from "../src/paginas/FunilSdr";

const JUCA: MetricasSdrFunil = { abordagens: 0, respondidos: 0, inscricoes_realizadas: 10, indicacoes: 6, reunioes_agendadas: 9 };
const JENNIFER: MetricasSdrFunil = { abordagens: 24, respondidos: 344, inscricoes_realizadas: 9, indicacoes: 5, reunioes_agendadas: 7 };

function metrica(parcial: Partial<MetricaTime> & Pick<MetricaTime, "metrica" | "nome_exibicao" | "realizado" | "meta_periodo">): MetricaTime {
  return { pct_atingimento: null, falta_folga: null, horas_restantes: null, media_necessaria: null, previsao: null, ...parcial };
}

const RESPOSTA: RespostaFunilSdr = {
  periodo: { granularidade: "mes", inicio: "2026-11-01", fim: "2026-11-30" },
  dias_uteis: { decorridos: 12, total: 22 },
  avisos: [],
  metricas_time: [
    metrica({
      metrica: "inscricoes_realizadas",
      nome_exibicao: "Inscrições Realizadas",
      realizado: 19,
      meta_periodo: 88,
      pct_atingimento: 21.6,
      falta_folga: { tipo: "falta", valor: 69 },
      media_necessaria: { valor: 6.9, unidade: "dia", situacao: "pendente" },
      previsao: 34.8,
    }),
    metrica({ metrica: "indicacoes", nome_exibicao: "Indicações Captadas", realizado: 11, meta_periodo: null }),
    metrica({
      metrica: "reunioes_agendadas",
      nome_exibicao: "Reuniões Agendadas",
      realizado: 50,
      meta_periodo: 44,
      pct_atingimento: 113.6,
      falta_folga: { tipo: "folga", valor: 6 },
      media_necessaria: { valor: null, unidade: "dia", situacao: "meta_batida" },
    }),
  ],
  funil: { numeros_captados: 189, indicacoes: 11, oportunidades: 200, abordados: 150, respondidos: 60, inscritos: 19 },
  sdrs: [
    { id_user: "11", nome: "Juca", imagem_url: null, metricas: JUCA, meta_inscricoes: 44, serie: [{ data: "2026-11-03", metricas: JUCA }] },
    { id_user: "14", nome: "Jennifer", imagem_url: null, metricas: JENNIFER, meta_inscricoes: null, serie: [] },
  ],
  evento: { id: "e1", titulo: "Confraria Akeel SP", data: "2026-11-20T22:00:00", inscritos: 39, inscritos_periodo: 12, aprovados: 30, pendentes: 9, rejeitados: 3, capacidade: 80, meta_velocimetro: 80, almocos_pagos: 3 },
};

vi.mock("../src/lib/api", () => ({ buscarFunilSdr: vi.fn(async () => RESPOSTA) }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

function renderizar(url = "/funil-sdr?granularidade=mes&periodo=2026-11") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <AtualizacaoProvider>
        <FunilSdr />
      </AtualizacaoProvider>
    </MemoryRouter>,
  );
}

it("busca o funil de SDR com o período do header", async () => {
  renderizar();
  await screen.findByRole("meter", { name: "Inscrições Realizadas" });
  expect(buscarFunilSdr).toHaveBeenCalledWith({ granularidade: "mes", periodo: "2026-11", evento: null });
});

it("com um evento escolhido no filtro, busca o funil de SDR com os números dele", async () => {
  renderizar("/funil-sdr?granularidade=mes&periodo=2026-11&evento=e-antigo");
  await screen.findByRole("meter", { name: "Inscrições Realizadas" });
  expect(buscarFunilSdr).toHaveBeenCalledWith({ granularidade: "mes", periodo: "2026-11", evento: "e-antigo" });
});

it("velocímetro mostra os inscritos da próxima Confraria contra a capacidade, com título e data do evento", async () => {
  renderizar();
  const velocimetro = await screen.findByRole("meter", { name: "Inscrições Realizadas" });
  // Fixo: todos os inscritos do evento (aprovados + pendentes), não só os do período.
  expect(velocimetro.getAttribute("aria-valuenow")).toBe("39");
  expect(velocimetro.getAttribute("aria-valuemax")).toBe("80");
  expect(velocimetro.textContent).toContain("Confraria Akeel SP");
  // 22:00 UTC = 19:00 em São Paulo.
  expect(velocimetro.textContent).toContain("20/11 · 19:00");
});

it("velocímetro mostra o total de inscritos do evento no SED (aprovados + pendentes) contra a capacidade, fixo em qualquer filtro", async () => {
  vi.mocked(buscarFunilSdr).mockResolvedValueOnce({
    ...RESPOSTA,
    periodo: { granularidade: "dia", inicio: "2026-11-17", fim: "2026-11-17" },
    evento: { ...RESPOSTA.evento!, inscritos_periodo: 2, meta_velocimetro: 4 },
  });
  renderizar("/funil-sdr?granularidade=dia&periodo=2026-11-17");
  const velocimetro = await screen.findByRole("meter", { name: "Inscrições Realizadas" });
  expect(velocimetro.getAttribute("aria-valuenow")).toBe("39");
  expect(velocimetro.getAttribute("aria-valuemax")).toBe("80");
});

it("evento sem capacidade: meta aberta", async () => {
  vi.mocked(buscarFunilSdr).mockResolvedValueOnce({ ...RESPOSTA, evento: { ...RESPOSTA.evento!, capacidade: null } });
  renderizar();
  const velocimetro = await screen.findByRole("meter", { name: "Inscrições Realizadas" });
  expect(velocimetro.textContent).toContain("Meta aberta");
});

it("sem Confraria agendada o velocímetro avisa e fica sem meta", async () => {
  vi.mocked(buscarFunilSdr).mockResolvedValueOnce({ ...RESPOSTA, evento: null });
  renderizar();
  const velocimetro = await screen.findByRole("meter", { name: "Inscrições Realizadas" });
  expect(velocimetro.getAttribute("aria-valuenow")).toBe("0");
  expect(velocimetro.textContent).toContain("Nenhum evento agendado");
  expect(velocimetro.textContent).toContain("Meta aberta");
});

it("velocímetros de inscrições do Juca e da Jennifer no período, contra a meta de cada um", async () => {
  renderizar();
  const bloco = await screen.findByRole("region", { name: "Inscrições por SDR e do evento" });
  const [juca, jennifer] = within(bloco).getAllByRole("meter");
  expect([juca.getAttribute("aria-label"), juca.getAttribute("aria-valuenow"), juca.getAttribute("aria-valuemax")]).toEqual([
    "Inscrições Juca",
    "10",
    "44",
  ]);
  expect(jennifer.getAttribute("aria-label")).toBe("Inscrições Jennifer");
  expect(jennifer.getAttribute("aria-valuenow")).toBe("9");
  expect(jennifer.textContent).toContain("Meta aberta");
});

it("velocímetros dos SDRs: foto no lugar do título, % embaixo e sem chip de status", async () => {
  renderizar();
  const bloco = await screen.findByRole("region", { name: "Inscrições por SDR e do evento" });
  const juca = within(bloco).getAllByRole("meter")[0];
  expect(juca.querySelector("[data-foto]")?.textContent).toBe("J"); // sem foto: inicial
  expect(juca.textContent).not.toContain("Inscrições Juca");
  expect(juca.querySelector("[data-pct]")?.textContent).toBe("22,7%");
  expect(juca.textContent).not.toContain("Muito atrás");
});

it("velocímetros dos SDRs piscam na cor do atingimento; sem meta não piscam", async () => {
  renderizar();
  const bloco = await screen.findByRole("region", { name: "Inscrições por SDR e do evento" });
  // Juca: 10 de 44 = 22,7% → vermelho. Jennifer: sem meta.
  expect([...bloco.querySelectorAll(".card-velocimetro")].map((c) => c.getAttribute("data-alerta"))).toEqual([
    "muito_atras",
    "sem_meta",
  ]);
});

it("na mesma linha dos velocímetros: almoços pagos e o total de inscrições do evento (somatório fixo)", async () => {
  renderizar();
  const bloco = await screen.findByRole("region", { name: "Inscrições por SDR e do evento" });
  expect(bloco.children).toHaveLength(4);
  const cards = [...bloco.querySelectorAll("article")].map((c) => c.textContent ?? "");
  expect(cards).toEqual(["Almoços Pagos3", "Inscrições Realizadassomatório fixo39"]);
  expect(bloco.textContent).not.toContain("Pendentes");
});

it("sem evento somem os cards do evento; SDR sem linha no período mostra 0", async () => {
  vi.mocked(buscarFunilSdr).mockResolvedValueOnce({ ...RESPOSTA, evento: null, sdrs: RESPOSTA.sdrs.slice(0, 1) });
  renderizar();
  const bloco = await screen.findByRole("region", { name: "Inscrições por SDR e do evento" });
  expect(within(bloco).getAllByRole("meter").map((m) => m.getAttribute("aria-valuenow"))).toEqual(["10", "0"]);
  expect(bloco.querySelectorAll("article")).toHaveLength(0);
});

it("tabela tem uma linha por SDR e o TOTAL", async () => {
  renderizar();
  const tabela = await screen.findByRole("table", { name: "Por SDR" });
  const linhas = within(tabela).getAllByRole("row");
  expect(linhas.map((l) => l.textContent)).toEqual([
    "SDRAbordagensResponderamInscrições RealizadasIndicações CaptadasReuniões Agendadas",
    "JJuca001069", // sem foto: o Avatar mostra a inicial
    "Jennifer24344957",
    "TOTAL24344191116",
  ]);
});

it("funil de cima pra baixo: Oportunidades, Abordados, Respondido, Inscritos, com as passagens", async () => {
  renderizar();
  const funil = await screen.findByRole("list", { name: "Funil SDR" });
  const etapas = within(funil).getAllByRole("listitem");
  expect(etapas.map((e) => e.querySelector("[data-segmento]")?.textContent)).toEqual([
    "Oportunidades*200",
    "Abordados150",
    "Respondido60",
    "Inscritos19",
  ]);
  expect(etapas[0].textContent).toContain("75,0% abordados");
  expect(etapas[1].textContent).toContain("40,0% responderam");
  expect(etapas[2].textContent).toContain("31,7% se inscreveram");
  // Conversão total: inscritos ÷ oportunidades.
  expect(screen.getByRole("group", { name: "Conversão total do funil" }).textContent).toContain("9,5%");
});

it("Oportunidades mostra a composição: números captados + indicações", async () => {
  renderizar();
  const funil = await screen.findByRole("list", { name: "Funil SDR" });
  const oportunidades = within(funil).getAllByRole("listitem")[0];
  expect(oportunidades.querySelector("[data-marca-nota]")?.textContent).toBe("*");
  // A composição vai como nota no rodapé do card, não dentro do funil.
  expect(document.querySelector("[data-nota-rodape]")?.textContent).toBe("* Oportunidades: 189 números + 11 indicações");
});
