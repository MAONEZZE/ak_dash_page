// @vitest-environment jsdom
//
// Card de ranking contra a meta: valor acumulado do mês (Pipedrive) contra a meta do mês, com o dia
// em verde claro e o acumulado em verde escuro, negócios embaixo do nome (quando informados),
// marcadores 70/100/120%, tick de ritmo, run rate e o badge opcional.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { diasUteisDecorridos, type ItemRanking, RankingMeta } from "../src/componentes/RankingMeta";

afterEach(() => cleanup());

function item(nome: string, valor: number, valorHoje = 0, negocios: number | undefined = 0, meta: number | null = 40): ItemRanking {
  return { id: nome.toLowerCase(), nome, valor, valorHoje, meta, negocios };
}

const NOVEMBRO = { inicio: "2026-11-01", fim: "2026-11-30" };
// Quarta, 25/11, meio-dia: 17 dias úteis antes + meio dia de 21.
const AGORA = new Date(2026, 10, 25, 12, 0);

function renderizar(itens: ItemRanking[], badge: string | null = "57 inscritos") {
  render(
    <RankingMeta
      titulo="Ranking SDR — Inscritos gerados"
      rotuloLista="Ranking SDR"
      itens={itens}
      janela={NOVEMBRO}
      unidade={{ singular: "inscrição", plural: "inscrições" }}
      legendaHoje="Inscrições de hoje"
      badge={badge}
      vazio="Nenhum SDR ativo."
      agora={AGORA}
    />,
  );
}

describe("RankingMeta", () => {
  it("ordena por inscrições do mês, com medalha até o 3º e badge do 4º em diante", () => {
    renderizar([item("Gustavo", 5), item("Ana", 30), item("Bia", 12), item("Caio", 1)]);

    const itens = within(screen.getByRole("list", { name: "Ranking SDR" })).getAllByRole("listitem");
    expect(itens.map((i) => i.getAttribute("data-item"))).toEqual(["ana", "bia", "gustavo", "caio"]);
    expect(itens.map((i) => i.querySelector("[data-posicao]")?.getAttribute("data-posicao"))).toEqual(["1º", "2º", "3º", "4º"]);
    expect(itens[3].querySelector("[data-posicao]")?.textContent).toBe("4º");
  });

  it("mostra negócios embaixo do nome e inscrições de hoje, total, meta do mês e %", () => {
    renderizar([item("Ana", 30, 2, 295), item("Bia", 10, 0, 1)]);

    const [ana, bia] = screen.getAllByRole("listitem");
    expect(ana.querySelector("[data-negocios]")?.textContent).toBe("295 negócios");
    expect(bia.querySelector("[data-negocios]")?.textContent).toBe("1 negócio");
    expect(ana.querySelector("[data-numeros]")?.textContent).toBe("+2 hoje30/ 4075%");
    expect(bia.querySelector("[data-hoje]")).toBeNull();
  });

  it("header traz a meta do mês do time e o badge informado", () => {
    renderizar([item("Ana", 30, 0, 0, 47), item("Bia", 10, 0, 0, 41)]);

    expect(screen.getByText("Meta até 30/11:").textContent).toContain("88");
    expect(document.querySelector("[data-total-geral]")?.textContent).toBe("57 inscritos");
  });

  it("sem badge, não mostra o badge", () => {
    renderizar([item("Ana", 30)], null);

    expect(document.querySelector("[data-total-geral]")).toBeNull();
  });

  it("barra: acumulado do mês e o dia sobrepostos a partir do início, sobre 120% da meta, marcadores e tick de ritmo", () => {
    renderizar([item("Ana", 30, 6)]); // meta 40 → trilho de 48

    const linha = screen.getByRole("listitem");
    const segmento = (seg: string) => linha.querySelector(`[data-segmento="${seg}"]`) as HTMLElement;
    expect(parseFloat(segmento("acumulado").style.width)).toBeCloseTo(62.5, 5); // 30 / 48
    expect(parseFloat(segmento("hoje").style.width)).toBeCloseTo(12.5, 5); // 6 / 48
    for (const seg of ["acumulado", "hoje"]) expect(segmento(seg).classList.contains("left-0")).toBe(true);
    // o dia vem depois no DOM: pinta na frente do mês
    expect(segmento("acumulado").compareDocumentPosition(segmento("hoje")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-label")).toBe("Inscrições de Ana");

    // 30 de 40: passou 70% (28), não passou 100% nem 120%
    const atingidos = Array.from(linha.querySelectorAll("[data-marcador]")).map((m) => m.getAttribute("data-atingido"));
    expect(atingidos).toEqual(["true", "false", "false"]);

    const tick = parseFloat((linha.querySelector("[data-ritmo]") as HTMLElement).style.left);
    expect(tick).toBeCloseTo((17.5 / 21) * (100 / 1.2), 1); // 69,44
  });

  it("run rate projeta o fechamento do mês: verde se ≥ 100% da meta, laranja se abaixo", () => {
    renderizar([item("Ana", 40), item("Bia", 10)]);

    const [ana, bia] = screen.getAllByRole("listitem");
    const valorAna = ana.querySelector("[data-run-rate] span") as HTMLElement;
    expect(valorAna.textContent).toBe("48 inscrições (120% da meta)"); // 40 / 17,5 × 21
    expect(valorAna.classList.contains("text-ok")).toBe(true);
    expect((bia.querySelector("[data-run-rate] span") as HTMLElement).classList.contains("text-fogo")).toBe(true);
  });

  it("sem meta: sem marcadores, sem % e barra vazia", () => {
    renderizar([item("Ana", 30, 0, 0, null)]);

    const linha = screen.getByRole("listitem");
    expect(linha.querySelectorAll("[data-marcador]")).toHaveLength(0);
    expect(linha.querySelector("[data-pct]")).toBeNull();
    expect(linha.querySelector("[data-run-rate] span")?.textContent).toBe("36 inscrições");
  });

  it("dias úteis decorridos contam só seg–sex, fracionam o dia de hoje pela hora e param no fim da janela", () => {
    expect(diasUteisDecorridos("2026-11-01", "2026-11-30", AGORA)).toEqual({ decorridos: 17.5, total: 21 });
    expect(diasUteisDecorridos("2026-11-01", "2026-11-30", new Date(2026, 10, 28, 10, 0))).toEqual({ decorridos: 20, total: 21 });
    expect(diasUteisDecorridos("2026-11-01", "2026-11-25", AGORA)).toEqual({ decorridos: 17.5, total: 18 });
    expect(diasUteisDecorridos("2026-10-01", "2026-10-31", AGORA)).toEqual({ decorridos: 22, total: 22 });
    expect(diasUteisDecorridos("2026-12-01", "2026-12-31", AGORA)).toEqual({ decorridos: 0, total: 23 });
  });

  it("com janela até a véspera do evento, o cabeçalho mostra o fim dela", () => {
    render(
      <RankingMeta
        titulo="Ranking Seller"
        rotuloLista="Ranking Seller"
        itens={[item("Ana", 30)]}
        janela={{ inicio: "2026-11-01", fim: "2026-11-25" }}
        unidade={{ singular: "venda", plural: "vendas" }}
        legendaHoje="Vendas de hoje"
        vazio="Nenhum seller ativo."
        agora={AGORA}
      />,
    );

    expect(screen.getByText("Meta até 25/11:")).toBeTruthy();
  });

  it("mostra aviso quando não há SDR ativo", () => {
    renderizar([]);

    expect(screen.getByText("Nenhum SDR ativo.")).toBeTruthy();
  });

  it("sem negocios no item, não mostra a linha embaixo do nome", () => {
    renderizar([{ ...item("Ana", 30), negocios: undefined }]);

    expect(document.querySelector("[data-negocios]")).toBeNull();
  });

  it("textos e ícones do card ficam em dobro", () => {
    renderizar([item("Ana", 30, 2, 295), item("Bia", 12), item("Caio", 5), item("Duda", 1)]);

    expect(screen.getByRole("heading", { level: 2 }).classList.contains("text-[40px]")).toBe(true);
    expect(screen.getByText("Meta até 30/11:").parentElement?.classList.contains("text-[24px]")).toBe(true);
    expect(document.querySelector("header svg")?.getAttribute("width")).toBe("44");

    const [ana] = screen.getAllByRole("listitem");
    expect(ana.querySelector("span.truncate")?.classList.contains("text-[36px]")).toBe(true);
    expect(ana.querySelector("[data-negocios]")?.classList.contains("text-[26px]")).toBe(true);
    expect(ana.querySelector("[data-hoje]")?.classList.contains("text-[32px]")).toBe(true);
    expect(ana.querySelector("[data-total]")?.classList.contains("text-[44px]")).toBe(true);
    expect(ana.querySelector("[data-pct]")?.classList.contains("text-[28px]")).toBe(true);
    expect(ana.querySelector("[data-run-rate]")?.classList.contains("text-[26px]")).toBe(true);
    expect(ana.querySelector("[data-posicao] svg")?.getAttribute("width")).toBe("52");
    for (const marcador of Array.from(ana.querySelectorAll("[data-marcador] svg"))) {
      expect(marcador.getAttribute("width")).toBe("40");
    }

    const quarto = screen.getAllByRole("listitem")[3].querySelector("[data-posicao]");
    expect(quarto?.classList.contains("h-[52px]")).toBe(true);
    expect(quarto?.classList.contains("w-[52px]")).toBe(true);
    expect(quarto?.classList.contains("text-[24px]")).toBe(true);

    const bolinhas = Array.from(document.querySelectorAll("header span.inline-block"));
    expect(bolinhas).toHaveLength(2);
    for (const bolinha of bolinhas) {
      expect(bolinha.classList.contains("h-4")).toBe(true);
      expect(bolinha.classList.contains("w-4")).toBe(true);
    }
  });
  it("até 2 pessoas o conteúdo fica no tamanho cheio; com mais, encolhe na proporção 2 ÷ pessoas", () => {
    const escala = () => Number(document.querySelector("[data-escala]")?.getAttribute("data-escala"));

    renderizar([item("Ana", 30), item("Bia", 12)]);
    expect(escala()).toBe(1);
    cleanup();

    renderizar([item("Ana", 30)]);
    expect(escala()).toBe(1);
    cleanup();

    renderizar([item("Ana", 30), item("Bia", 12), item("Caio", 5)]);
    expect(escala()).toBeCloseTo(2 / 3);
    cleanup();

    renderizar([item("Ana", 30), item("Bia", 12), item("Caio", 5), item("Duda", 1)]);
    expect(escala()).toBe(0.5);
    // O cabeçalho e a lista ficam dentro do bloco escalado.
    const bloco = document.querySelector("[data-escala]") as HTMLElement;
    expect(bloco.contains(screen.getByRole("heading", { level: 2 }))).toBe(true);
    expect(bloco.contains(screen.getByRole("list", { name: "Ranking SDR" }))).toBe(true);
  });
});
