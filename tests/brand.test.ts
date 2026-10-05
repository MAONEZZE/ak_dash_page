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

// Paleta do redesign 2026-10 (ak_dash_page/prompt.md) — ver comentário em
// src/app/globals.css. Status nunca depende só de cor (StatusChip leva ícone).
const TOKENS_PERMITIDOS = new Set([
  "#8edd65",
  "#2f6b1f",
  "#0c1b1f",
  "#f4f4f4",
  "#0f1a1c",
  // claro
  "#ebf0e6",
  "#f7f8f5",
  "#eef1ea",
  "#16201a",
  "#56635a",
  "#8a968e",
  "#2a6f1e",
  "#855b00",
  "#d49a1c",
  "#b23a26",
  "#3f5d8a",
  // escuro
  "#0d1611",
  "#152019",
  "#1c2a21",
  "#e6ece4",
  "#a6b2a9",
  "#7d8a81",
  "#9db5dc",
  // vermelho do "Sair" (claro) e muito atrás/Sair (escuro), atrás (escuro)
  "#b3261e",
  "#f28b82",
  "#f2c94c",
  // termômetro de faturamento da Geral: frio e quente
  "#3b8fd6",
  "#ef6c1a",
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
