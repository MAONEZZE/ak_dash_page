// @vitest-environment jsdom
//
// SDRs e closers são duas tabelas separadas (cards de cor diferente), uma
// embaixo da outra. Com largura automática cada uma se ajustava ao próprio
// conteúdo e as colunas não batiam entre os dois cards — os números de um
// cargo são mais largos que os do outro. A grade agora é fixa e igual nas duas.
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TabelaPessoas } from "../src/componentes/TabelaPessoas";
import type { Cargo, PessoaGeral } from "../src/lib/tipos-api";

function pessoa(id: number, cargo: Cargo, rotulo: string, valores: number[]): PessoaGeral {
  const metricas = cargo === "sdr" ? ["conexoes_enviadas", "abordagens", "fups", "reunioes_agendadas"] : ["ligacoes_realizadas", "reunioes_agendadas", "reunioes_realizadas", "indicacoes"];
  return {
    id_user: id,
    nome: rotulo,
    cargo,
    rotulo,
    imagem_url: null,
    pontuacao: null,
    posicao: null,
    metricas: metricas.map((metrica, i) => ({
      metrica,
      nome_exibicao: metrica,
      realizado: valores[i] ?? 0,
      meta: 100,
    })),
  } as PessoaGeral;
}

const PESSOAS = [
  // Números bem desiguais de propósito: é a largura do conteúdo que
  // desalinhava as duas tabelas quando a largura era automática.
  pessoa(1, "sdr", "Jennifer Pamplona", [1, 2, 3, 4]),
  pessoa(2, "closer", "Nathan Mayumi", [123456, 234567, 345678, 456789]),
];

const DIAS = { decorridos: 10, total: 20 };

afterEach(() => cleanup());

describe("TabelaPessoas", () => {
  it("usa a mesma grade de colunas nos dois cards", () => {
    const { container } = render(<TabelaPessoas pessoas={PESSOAS} dias={DIAS} />);
    const tabelas = [...container.querySelectorAll("table")];
    expect(tabelas).toHaveLength(2);

    const grade = (tabela: HTMLTableElement) => [...tabela.querySelectorAll("col")].map((c) => c.style.width);

    expect(tabelas[0].className).toContain("table-fixed");
    expect(tabelas[1].className).toContain("table-fixed");
    // 5 colunas: a da pessoa + as 4 métricas do cargo.
    expect(grade(tabelas[0])).toHaveLength(5);
    expect(grade(tabelas[0])).toEqual(grade(tabelas[1]));
  });

  it("barra fina de ritmo só nas células com meta; Liquidado e meta 0/nula ficam só com o valor", () => {
    const closer: PessoaGeral = {
      ...pessoa(3, "closer", "Bruno", []),
      metricas: [
        { metrica: "reunioes_realizadas", nome_exibicao: "Reuniões", realizado: 2, meta: 10 }, // 2 de 5 esperados: muito atrás
        { metrica: "liquidado", nome_exibicao: "Liquidado", realizado: 5000, meta: null },
        { metrica: "indicacoes", nome_exibicao: "Indicações", realizado: 3, meta: 0 },
        { metrica: "inscricoes_realizadas", nome_exibicao: "Inscrições", realizado: 1, meta: null },
      ],
    };
    const { container } = render(<TabelaPessoas pessoas={[closer]} dias={DIAS} />);

    const celulas = [...container.querySelectorAll("tbody td")].slice(1);
    expect(celulas.map((c) => c.querySelector('[role="progressbar"]') !== null)).toEqual([true, false, false, false]);
    expect(celulas[0].querySelector(".bg-bad")).not.toBeNull();
    // Meta 0 não pode vazar um "0" solto na célula.
    expect(celulas[2].textContent).toBe("3/ 0");
  });
});
