// @vitest-environment jsdom
//
// Faturamento e Liquidado (os dois cards escuros da Geral) dividem a faixa de
// cima com Inscritos/Aprovados, que são CardEventoRotativo. As escalas
// tipográficas dos quatro números são diferentes (número curto cresce, moeda
// longa encolhe), então alinhar pelo topo deixaria as baselines em alturas
// diferentes: os quatro se alinham encostando o número na base do card, com a
// sobra de altura indo toda pra cima dele.
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CardEventoRotativo } from "../src/componentes/CardEventoRotativo";
import { CardKpi } from "../src/componentes/CardKpi";
import { escalaValorCompacto, escalaValorCompactoDestaque } from "../src/lib/card-compacto";
import type { EventoGeral } from "../src/lib/tipos-api";

const EVENTOS: EventoGeral[] = [
  { id: "1", titulo: "Imersão Akeel", data: "2026-10-02T19:00:00Z", inscritos: 120, aprovados: 30, capacidade: 200 },
];

afterEach(() => cleanup());

/** Bloco do número e o rodapé logo abaixo dele, na ordem em que estão no card. */
function baseDoCard(container: HTMLElement) {
  const article = container.querySelector("article")!;
  const filhos = [...article.children];
  const bloco = container.querySelector(".font-display")!.closest("article > *")!;
  return { bloco, rodape: filhos[filhos.indexOf(bloco) + 1], ultimo: filhos.at(-1) };
}

describe("Faturamento/Liquidado alinhados com os cards de evento", () => {
  it("encosta o número na base, igual ao card de evento ao lado", () => {
    const faturamento = render(
      <CardKpi variante="escuro" tamanho="compacto" destaque label="Faturamento" value="R$ 190.000,00" pct={null} legenda="" />,
    );
    const evento = render(<CardEventoRotativo label="Inscritos" campo="inscritos" eventos={EVENTOS} />);

    for (const { container } of [faturamento, evento]) {
      const { bloco, rodape, ultimo } = baseDoCard(container);
      // A sobra de altura do card fica acima do número (o `mt-auto` é dele), e
      // o rodapé vem logo em seguida, colado — é isso que faz os dois números
      // caírem na mesma linha apesar das escalas diferentes.
      expect(bloco.className).toContain("mt-auto");
      expect(rodape).toBeTruthy();
      expect(rodape!.className).not.toContain("mt-auto");
      expect(rodape).toBe(ultimo);
    }

    const numero = faturamento.container.querySelector(".font-display")!;
    expect(numero.textContent).toBe("R$ 190.000,00");
    expect(numero.className).toContain(escalaValorCompactoDestaque("R$ 190.000,00"));
    expect(numero.parentElement!.className).toContain("items-baseline");
  });

  it("card comum (sem destaque) segue com o número no topo e o rodapé na base", () => {
    const { container } = render(
      <CardKpi tamanho="compacto" label="Indicações" value="12" meta="20" pct={60} legenda="60% da meta" />,
    );

    const { bloco, rodape } = baseDoCard(container);
    expect(bloco.className).not.toContain("mt-auto");
    expect(rodape!.className).toContain("mt-auto");
    expect(container.querySelector(".font-display")!.className).toContain(escalaValorCompacto("12"));
  });

  it("o número dos cards de destaque é 1,3× o do card comum, em todos os passos", () => {
    /** Os números de dentro do `clamp(...)`: mínimo, teto em vw, teto em vh, máximo. */
    const medidas = (classe: string) => [...classe.matchAll(/([\d.]+)(?:px|vw|vh)/g)].map((m) => Number(m[1]));

    for (const valor of ["12", "1.234", "R$ 1.234,00", "R$ 190.000,00"]) {
      const comum = medidas(escalaValorCompacto(valor));
      const emDestaque = medidas(escalaValorCompactoDestaque(valor));

      expect(emDestaque).toHaveLength(comum.length);
      comum.forEach((medida, i) => expect(emDestaque[i] / medida).toBeCloseTo(1.3, 1));
    }
  });
});
