import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard de marca — falha em hex cru fora dos tokens definidos em
 * src/app/globals.css, nos hexes banidos do blog.akeel.com.br, e nos pares
 * proibidos de contraste descritos em docs/plans/dashboard-akeel.md.
 */

const SRC_DIR = join(__dirname, "..", "src");
const EXTENSOES_FONTE = [".ts", ".tsx", ".css"];
const IGNORAR_DIRS = new Set(["fixtures", "node_modules"]);

// status-bad (azul) é a exceção deliberada: verde-da-marca falha CVD contra
// qualquer vermelho (daltonismo vermelho-verde), validado com a skill de
// dataviz — ver comentário em src/app/globals.css.
// #eaeee9 (page-bg) é o fundo de página do redesign novo_template — ver
// docs/plans/novo-layout-template.md.
const TOKENS_PERMITIDOS = new Set([
  "#8edd65",
  "#2f6b0f",
  "#0c1b1f",
  "#f4f4f4",
  "#0f1a1c",
  "#1d4ed8",
  "#3987e5",
  "#eaeee9",
  // vermelho do "Sair" (claro/escuro) — ver comentário em src/app/globals.css
  "#b3261e",
  "#f28b82",
]);
const HEXES_BANIDOS_DO_BLOG = new Set(["#5ca838", "#dfe3e1", "#8b9a9f", "#51636a", "#16262b"]);

function listarArquivosFonte(dir: string): string[] {
  const arquivos: string[] = [];
  for (const entrada of readdirSync(dir)) {
    if (IGNORAR_DIRS.has(entrada)) continue;
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      arquivos.push(...listarArquivosFonte(caminho));
    } else if (EXTENSOES_FONTE.some((ext) => caminho.endsWith(ext))) {
      arquivos.push(caminho);
    }
  }
  return arquivos;
}

function extrairHexes(conteudo: string): string[] {
  const matches = conteudo.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  return matches.map((h) => h.toLowerCase());
}

describe("guard de marca", () => {
  const arquivos = listarArquivosFonte(SRC_DIR);

  it("encontrou arquivos fonte para varrer", () => {
    expect(arquivos.length).toBeGreaterThan(0);
  });

  it("não usa nenhum hex cru fora dos tokens de marca", () => {
    const violacoes: string[] = [];
    for (const arquivo of arquivos) {
      const conteudo = readFileSync(arquivo, "utf-8");
      for (const hex of extrairHexes(conteudo)) {
        if (!TOKENS_PERMITIDOS.has(hex)) {
          violacoes.push(`${arquivo}: ${hex}`);
        }
      }
    }
    expect(violacoes).toEqual([]);
  });

  it("não usa nenhum dos hexes banidos do blog.akeel.com.br", () => {
    const violacoes: string[] = [];
    for (const arquivo of arquivos) {
      const conteudo = readFileSync(arquivo, "utf-8");
      for (const hex of extrairHexes(conteudo)) {
        if (HEXES_BANIDOS_DO_BLOG.has(hex)) {
          violacoes.push(`${arquivo}: ${hex}`);
        }
      }
    }
    expect(violacoes).toEqual([]);
  });

  it("não combina accent (não accent-ink) com fundo offwhite na mesma linha", () => {
    const padrao = /text-accent(?!-)|bg-accent(?!-)/;
    const violacoes = buscarComboNaMesmaLinha(arquivos, padrao, /bg-offwhite/);
    expect(violacoes).toEqual([]);
  });

  it("não combina accent-ink com fundo escuro (ink ou bg-dark-2) na mesma linha", () => {
    const padrao = /text-accent-ink/;
    const violacoes = buscarComboNaMesmaLinha(arquivos, padrao, /bg-ink|bg-bg-2|bg-dark-2/);
    expect(violacoes).toEqual([]);
  });

  it("não usa border-current/20 (falha WCAG 1.4.11 — usar /50)", () => {
    const violacoes: string[] = [];
    for (const arquivo of arquivos) {
      if (readFileSync(arquivo, "utf-8").includes("border-current/20")) {
        violacoes.push(arquivo);
      }
    }
    expect(violacoes).toEqual([]);
  });
});

function buscarComboNaMesmaLinha(arquivos: string[], padraoA: RegExp, padraoB: RegExp): string[] {
  const violacoes: string[] = [];
  for (const arquivo of arquivos) {
    const linhas = readFileSync(arquivo, "utf-8").split("\n");
    linhas.forEach((linha, indice) => {
      if (padraoA.test(linha) && padraoB.test(linha)) {
        violacoes.push(`${arquivo}:${indice + 1}`);
      }
    });
  }
  return violacoes;
}
