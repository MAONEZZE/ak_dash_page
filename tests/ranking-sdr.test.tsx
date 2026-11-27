// @vitest-environment jsdom
//
// Card "Ranking SDR": inscrições do mês (Pipedrive) contra a meta do mês, com o dia em verde
// claro e o acumulado em verde escuro, negócios embaixo do nome, marcadores 70/100/120%,
// tick de ritmo, run rate e o total de inscritos do SED no badge.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { diasDecorridos, RankingSdr } from "../src/componentes/RankingSdr";
import type { SdrPaginaSdr } from "../src/lib/tipos-api";

afterEach(() => cleanup());

function sdr(nome: string, inscricoes: number, inscricoes_hoje = 0, negocios = 0, meta: number | null = 40): SdrPaginaSdr {
  return {
    id_user: nome.toLowerCase(),
    nome,
    imagem_url: null,
    inscricoes: 0,
    meta_inscricoes: null,
    ligacoes: 0,
    pontuacao: 0,
    posicao: 1,
    meta_diaria: null,
    previsao: null,
    serie_evento: [],
    ranking_mes: { negocios, inscricoes, inscricoes_hoje, meta },
  };
}

const NOVEMBRO = { inicio: "2026-11-01", fim: "2026-11-30" };
// Dia 25 às 18h49: ≈ 24,78 dias decorridos de 30.
const AGORA = new Date(2026, 10, 25, 18, 49);

function renderizar(sdrs: SdrPaginaSdr[], inscritosSed: number | null = 57) {
  render(<RankingSdr sdrs={sdrs} mesRanking={NOVEMBRO} inscritosSed={inscritosSed} agora={AGORA} />);
}

describe("RankingSdr", () => {
  it("ordena por inscrições do mês, com medalha até o 3º e badge do 4º em diante", () => {
    renderizar([sdr("Gustavo", 5), sdr("Ana", 30), sdr("Bia", 12), sdr("Caio", 1)]);

    const itens = within(screen.getByRole("list", { name: "Ranking SDR" })).getAllByRole("listitem");
    expect(itens.map((i) => i.getAttribute("data-sdr"))).toEqual(["ana", "bia", "gustavo", "caio"]);
    expect(itens.map((i) => i.querySelector("[data-posicao]")?.getAttribute("data-posicao"))).toEqual(["1º", "2º", "3º", "4º"]);
    expect(itens[3].querySelector("[data-posicao]")?.textContent).toBe("4º");
  });

  it("mostra negócios embaixo do nome e inscrições de hoje, total, meta do mês e %", () => {
    renderizar([sdr("Ana", 30, 2, 295), sdr("Bia", 10, 0, 1)]);

    const [ana, bia] = screen.getAllByRole("listitem");
    expect(ana.querySelector("[data-negocios]")?.textContent).toBe("295 negócios");
    expect(bia.querySelector("[data-negocios]")?.textContent).toBe("1 negócio");
    expect(ana.querySelector("[data-numeros]")?.textContent).toBe("+2 hoje30/ 4075%");
    expect(bia.querySelector("[data-hoje]")).toBeNull();
  });

  it("header traz a meta do mês do time e o total de inscritos do SED", () => {
    renderizar([sdr("Ana", 30, 0, 0, 47), sdr("Bia", 10, 0, 0, 41)]);

    expect(screen.getByText("Meta do mês:").textContent).toContain("88");
    expect(document.querySelector("[data-total-geral]")?.textContent).toBe("57 inscritos");
  });

  it("sem evento no SED, sem badge", () => {
    renderizar([sdr("Ana", 30)], null);

    expect(document.querySelector("[data-total-geral]")).toBeNull();
  });

  it("barra: acumulado do mês e o dia sobrepostos a partir do início, sobre 120% da meta, marcadores e tick de ritmo", () => {
    renderizar([sdr("Ana", 30, 6)]); // meta 40 → trilho de 48

    const item = screen.getByRole("listitem");
    const segmento = (seg: string) => item.querySelector(`[data-segmento="${seg}"]`) as HTMLElement;
    expect(parseFloat(segmento("acumulado").style.width)).toBeCloseTo(62.5, 5); // 30 / 48
    expect(parseFloat(segmento("hoje").style.width)).toBeCloseTo(12.5, 5); // 6 / 48
    for (const seg of ["acumulado", "hoje"]) expect(segmento(seg).classList.contains("left-0")).toBe(true);
    // o dia vem depois no DOM: pinta na frente do mês
    expect(segmento("acumulado").compareDocumentPosition(segmento("hoje")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // 30 de 40: passou 70% (28), não passou 100% nem 120%
    const atingidos = Array.from(item.querySelectorAll("[data-marcador]")).map((m) => m.getAttribute("data-atingido"));
    expect(atingidos).toEqual(["true", "false", "false"]);

    const tick = parseFloat((item.querySelector("[data-ritmo]") as HTMLElement).style.left);
    expect(tick).toBeCloseTo(((24 + 18 / 24 + 49 / 1440) / 30) * (100 / 1.2), 1);
  });

  it("run rate projeta o fechamento do mês: verde se ≥ 100% da meta, laranja se abaixo", () => {
    renderizar([sdr("Ana", 40), sdr("Bia", 10)]);

    const [ana, bia] = screen.getAllByRole("listitem");
    const valorAna = ana.querySelector("[data-run-rate] span") as HTMLElement;
    expect(valorAna.textContent).toBe("48 inscrições (120% da meta)"); // 40 / 24,78 × 30
    expect(valorAna.classList.contains("text-ok")).toBe(true);
    expect((bia.querySelector("[data-run-rate] span") as HTMLElement).classList.contains("text-fogo")).toBe(true);
  });

  it("sem meta: sem marcadores, sem % e barra vazia", () => {
    renderizar([sdr("Ana", 30, 0, 0, null)]);

    const item = screen.getByRole("listitem");
    expect(item.querySelectorAll("[data-marcador]")).toHaveLength(0);
    expect(item.querySelector("[data-pct]")).toBeNull();
    expect(item.querySelector("[data-run-rate] span")?.textContent).toBe("36 inscrições");
  });

  it("dias decorridos são fracionados pela hora e param no fim do mês", () => {
    expect(diasDecorridos("2026-11-01", "2026-11-30", AGORA).decorridos).toBeCloseTo(24.78, 2);
    expect(diasDecorridos("2026-10-01", "2026-10-31", AGORA)).toEqual({ decorridos: 31, doMes: 31 });
  });

  it("mostra aviso quando não há SDR ativo", () => {
    renderizar([]);

    expect(screen.getByText("Nenhum SDR ativo.")).toBeTruthy();
  });
});
