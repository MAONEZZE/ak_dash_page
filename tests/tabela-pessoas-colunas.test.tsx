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

afterEach(() => cleanup());

describe("TabelaPessoas", () => {
  it("usa a mesma grade de colunas nos dois cards", () => {
    const { container } = render(<TabelaPessoas pessoas={PESSOAS} />);
    const tabelas = [...container.querySelectorAll("table")];
    expect(tabelas).toHaveLength(2);

    const grade = (tabela: HTMLTableElement) => [...tabela.querySelectorAll("col")].map((c) => c.style.width);

    expect(tabelas[0].className).toContain("table-fixed");
    expect(tabelas[1].className).toContain("table-fixed");
    // 5 colunas: a da pessoa + as 4 métricas do cargo.
    expect(grade(tabelas[0])).toHaveLength(5);
    expect(grade(tabelas[0])).toEqual(grade(tabelas[1]));
  });
});
