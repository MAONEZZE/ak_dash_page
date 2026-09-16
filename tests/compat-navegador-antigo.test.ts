import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { achatarCamadas } from "../build/achatar-camadas-css";

/**
 * Guard de compatibilidade com o browser antigo onde o dashboard fica aberto:
 * a TV Samsung 2023 (Tizen 7 / Chromium 94).
 *
 * Dois riscos distintos, travados aqui:
 *  1. `@layer` só existe do Chrome 99 pra cima. Como at-rule desconhecida o
 *     browser descarta o bloco inteiro — e o Tailwind v4 emite o stylesheet
 *     todo dentro de layers, então o site perdia ~76% do CSS.
 *  2. `color-mix()` só existe do Chrome 111 pra cima. O fallback que o Tailwind
 *     emite é a cor opaca, o que estraga tokens que só fazem sentido
 *     translúcidos (--progress-track vira trilho sólido).
 */

const RAIZ = join(__dirname, "..");
const GLOBALS_CSS = join(RAIZ, "src", "app", "globals.css");
const DIR_ASSETS = join(RAIZ, "dist", "assets");

describe("achatarCamadas", () => {
  it("remove o prelúdio e as chaves do bloco, mantendo o conteúdo", () => {
    expect(achatarCamadas("@layer utilities{.a{color:red}}")).toBe(".a{color:red}");
  });

  it("remove a declaração de ordem `@layer a,b;` inteira", () => {
    expect(achatarCamadas("@layer theme,base;.a{color:red}")).toBe(".a{color:red}");
  });

  it("preserva a ordem de fonte entre as layers, que é o que sustenta a cascata", () => {
    const entrada = "@layer base{a{color:red}}@layer utilities{.t{color:blue}}.autoral{color:green}";
    expect(achatarCamadas(entrada)).toBe("a{color:red}.t{color:blue}.autoral{color:green}");
  });

  it("achata layers aninhadas", () => {
    expect(achatarCamadas("@layer a{@layer b{.x{color:red}}}")).toBe(".x{color:red}");
  });

  it("mantém at-rules de dentro da layer intactas", () => {
    const entrada = "@layer utilities{@media (min-width:40rem){.a{color:red}}}";
    expect(achatarCamadas(entrada)).toBe("@media (min-width:40rem){.a{color:red}}");
  });

  it("não confunde chave dentro de string com fim de bloco", () => {
    const entrada = '@layer base{.a:before{content:"}"}}.b{color:red}';
    expect(achatarCamadas(entrada)).toBe('.a:before{content:"}"}.b{color:red}');
  });

  it("não confunde chave dentro de comentário com fim de bloco", () => {
    const entrada = "@layer base{/* } */.a{color:red}}";
    expect(achatarCamadas(entrada)).toBe("/* } */.a{color:red}");
  });

  it("não mexe em CSS que não tem layer", () => {
    const entrada = "@media print{.a{color:red}}@property --x{syntax:\"*\";inherits:false}";
    expect(achatarCamadas(entrada)).toBe(entrada);
  });

  it("é idempotente", () => {
    const uma = achatarCamadas("@layer base{a{color:red}}@layer utilities{.t{color:blue}}");
    expect(achatarCamadas(uma)).toBe(uma);
  });
});

describe("tokens de cor", () => {
  const css = readFileSync(GLOBALS_CSS, "utf-8");

  it("não usa color-mix() — sem suporte no Chromium 94", () => {
    const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const usos = semComentarios.match(/color-mix\(/g) ?? [];
    expect(usos).toEqual([]);
  });

  it("cada trio --x-rgb é o mesmo valor do hex --x correspondente", () => {
    const hexes = new Map<string, string>();
    for (const [, nome, hex] of css.matchAll(/--(color-[\w-]+):\s*#([0-9a-fA-F]{6})\s*;/g)) {
      hexes.set(nome, hex.toLowerCase());
    }
    const trios = [...css.matchAll(/--(color-[\w-]+)-rgb:\s*(\d+) (\d+) (\d+)\s*;/g)];

    expect(trios.length).toBeGreaterThan(0);
    const divergencias: string[] = [];
    for (const [, nome, r, g, b] of trios) {
      const hex = hexes.get(nome);
      if (hex === undefined) {
        divergencias.push(`--${nome}-rgb não tem --${nome} em hex`);
        continue;
      }
      const esperado = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");
      const obtido = `${r} ${g} ${b}`;
      if (obtido !== esperado) {
        divergencias.push(`--${nome}-rgb é "${obtido}", mas #${hex} é "${esperado}"`);
      }
    }
    expect(divergencias).toEqual([]);
  });

  it("todo token semântico com par -rgb define os dois nos dois temas", () => {
    const claro = css.slice(css.indexOf(":root {"), css.indexOf('[data-theme="dark"]'));
    const escuro = css.slice(css.indexOf('[data-theme="dark"]'));
    const faltando: string[] = [];
    for (const token of ["--fg", "--bg-2"]) {
      for (const [nome, bloco] of [["claro", claro], ["escuro", escuro]] as const) {
        if (bloco.includes(`${token}:`) && !bloco.includes(`${token}-rgb:`)) {
          faltando.push(`${token}-rgb ausente no tema ${nome}`);
        }
      }
    }
    expect(faltando).toEqual([]);
  });
});

describe("bundle publicado", () => {
  const css = existsSync(DIR_ASSETS)
    ? readdirSync(DIR_ASSETS)
        .filter((f) => f.endsWith(".css"))
        .map((f) => readFileSync(join(DIR_ASSETS, f), "utf-8"))
    : [];

  it.runIf(css.length > 0)("o CSS publicado não tem nenhuma @layer", () => {
    expect(css.flatMap((c) => c.match(/@layer[^{;]*[{;]/g) ?? [])).toEqual([]);
  });

  it.runIf(css.length > 0)("todo color-mix do CSS publicado está guardado por @supports", () => {
    // O Tailwind ainda gera color-mix nos modificadores de opacidade
    // (text-fg/50) — tudo bem, desde que venha dentro de @supports com uma
    // declaração opaca antes, que é o que o Chromium 94 vai pegar.
    const desguardados = css.flatMap((folha) => {
      const resto = removerBlocos(folha, "@supports (color:color-mix(in lab, red, red)){");
      return [...resto.matchAll(/color-mix\(/g)].map((m) => resto.slice(m.index, m.index! + 70));
    });
    expect(desguardados).toEqual([]);
  });
});

/** Remove do CSS todo bloco que começa com `prefixo`, casando as chaves. */
function removerBlocos(css: string, prefixo: string): string {
  let saida = css;
  for (;;) {
    const inicio = saida.indexOf(prefixo);
    if (inicio === -1) return saida;
    let profundidade = 0;
    let fim = inicio + prefixo.length - 1;
    for (let i = inicio + prefixo.length - 1; i < saida.length; i += 1) {
      if (saida[i] === "{") profundidade += 1;
      else if (saida[i] === "}") {
        profundidade -= 1;
        if (profundidade === 0) {
          fim = i;
          break;
        }
      }
    }
    saida = saida.slice(0, inicio) + saida.slice(fim + 1);
  }
}
