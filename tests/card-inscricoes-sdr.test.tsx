// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardInscricoesSdr } from "../src/componentes/CardInscricoesSdr";
import type { SdrPaginaSdr } from "../src/lib/tipos-api";

afterEach(() => cleanup());

function sdr(overrides: Partial<SdrPaginaSdr> & Pick<SdrPaginaSdr, "id_user" | "nome">): SdrPaginaSdr {
  return {
    imagem_url: null,
    inscricoes: 0,
    meta_inscricoes: 40,
    ligacoes: 0,
    pontuacao: 0,
    posicao: 1,
    meta_diaria: null,
    previsao: null,
    serie_evento: [],
    ...overrides,
  };
}

const juca = sdr({
  id_user: "1",
  nome: "Juca Silva",
  inscricoes: 30,
  meta_inscricoes: 40,
  previsao: { valor: 42, meta: 44, pct_meta: 95.5 },
});
const jennifer = sdr({
  id_user: "2",
  nome: "Jennifer Souza",
  inscricoes: 5,
  meta_inscricoes: 40,
  previsao: { valor: 9, meta: null, pct_meta: null },
});

describe("CardInscricoesSdr", () => {
  it("mostra cada SDR com foto, nome, barra colorida pelo atingimento, previsão e o total no canto", () => {
    render(<CardInscricoesSdr sdrs={[juca, jennifer]} />);

    const region = screen.getByRole("region", { name: "Inscrições Realizadas" });
    expect(within(region).getByRole("heading", { name: "Inscrições Realizadas" })).toBeTruthy();
    expect(region.querySelector("[data-total]")?.textContent).toBe("35");

    expect(within(region).getByRole("img", { name: "Juca Silva" })).toBeTruthy();
    expect(within(region).getByRole("img", { name: "Jennifer Souza" })).toBeTruthy();
    expect(within(region).getByText("Juca Silva")).toBeTruthy();
    expect(within(region).getByText("Jennifer Souza")).toBeTruthy();

    const barraJuca = region.querySelector<HTMLElement>('[data-sdr="Juca Silva"] [data-barra]');
    expect(barraJuca?.getAttribute("data-status")).toBe("no_ritmo");
    expect(barraJuca?.style.width).toBe("75%");

    const barraJennifer = region.querySelector<HTMLElement>('[data-sdr="Jennifer Souza"] [data-barra]');
    expect(barraJennifer?.getAttribute("data-status")).toBe("muito_atras");
    expect(barraJennifer?.style.width).toBe("12.5%");

    expect(region.querySelector('[data-sdr="Juca Silva"] [data-previsao]')?.textContent).toBe(
      "Previsão até o evento: 42 (95,5% da meta)",
    );
    expect(region.querySelector('[data-sdr="Jennifer Souza"] [data-previsao]')?.textContent).toBe(
      "Previsão até o evento: 9",
    );
  });

  it("não mostra a linha de previsão quando previsao é null", () => {
    render(<CardInscricoesSdr sdrs={[sdr({ id_user: "1", nome: "Juca Silva", inscricoes: 30, previsao: null })]} />);

    expect(document.querySelector('[data-sdr="Juca Silva"] [data-previsao]')).toBeNull();
  });

  it("sem meta_inscricoes marca sem_meta e barra com largura 0%", () => {
    render(<CardInscricoesSdr sdrs={[sdr({ id_user: "1", nome: "Juca Silva", inscricoes: 30, meta_inscricoes: null })]} />);

    const barra = document.querySelector<HTMLElement>('[data-sdr="Juca Silva"] [data-barra]');
    expect(barra?.getAttribute("data-status")).toBe("sem_meta");
    expect(barra?.style.width).toBe("0%");
  });
});
