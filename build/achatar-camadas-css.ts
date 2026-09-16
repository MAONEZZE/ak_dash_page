import type { Plugin } from "vite";

/**
 * Achata as `@layer` do CSS gerado pelo Tailwind v4.
 *
 * Cascade layers só existem a partir do Chrome 99. No browser da TV Samsung
 * 2023 (Tizen 7 / Chromium 94) `@layer` é at-rule desconhecida, e a regra de
 * error recovery do CSS manda descartar o bloco inteiro — o que jogava fora
 * ~76% do stylesheet (todo o Tailwind) e deixava o dashboard sem nenhuma
 * classe utilitária. Ver docs/plans/compat-navegador-antigo.md.
 *
 * Achatar preserva a cascata exata deste projeto porque a ordem de fonte já
 * reproduz a ordem das layers:
 *   - `@layer base` é só o Preflight: seletores de elemento/universal
 *     (especificidade máxima 0,0,1). As utilities (0,1,0) vêm depois no
 *     arquivo e continuam ganhando por especificidade.
 *   - nenhum seletor do Preflight colide com os seletores autorais
 *     (.dashboard-shell, .glass-panel, .glass-pill, .pill, body, :root).
 *   - o CSS autoral do globals.css é emitido depois de todas as layers, então
 *     continua ganhando os empates por ordem — mesmo resultado do
 *     "unlayered ganha de layered" que os browsers modernos aplicam hoje.
 *
 * tests/compat-navegador-antigo.test.ts trava essas premissas.
 */
export function achatarCamadas(css: string): string {
  const saida: string[] = [];
  // Um item por `{` aberto. true = essa chave veio de um `@layer` removido,
  // então o `}` correspondente também tem que sumir.
  const pilha: boolean[] = [];
  let i = 0;

  while (i < css.length) {
    const c = css[i];

    if (c === "/" && css[i + 1] === "*") {
      const fim = css.indexOf("*/", i + 2);
      const ate = fim === -1 ? css.length : fim + 2;
      saida.push(css.slice(i, ate));
      i = ate;
      continue;
    }

    if (c === '"' || c === "'") {
      const ate = fimDaString(css, i);
      saida.push(css.slice(i, ate));
      i = ate;
      continue;
    }

    if (c === "@" && ehAtRuleLayer(css, i)) {
      const delimitador = proximoDelimitador(css, i + "@layer".length);
      if (delimitador === -1) {
        // CSS truncado: devolve o resto cru em vez de comer o arquivo.
        saida.push(css.slice(i));
        break;
      }
      // `@layer a, b;` só declara ordem — some inteiro.
      // `@layer nome{` abre bloco — some o prelúdio, o conteúdo fica.
      if (css[delimitador] === "{") pilha.push(true);
      i = delimitador + 1;
      continue;
    }

    if (c === "{") {
      pilha.push(false);
      saida.push(c);
      i += 1;
      continue;
    }

    if (c === "}") {
      // pop() undefined = chave desbalanceada na entrada; preserva o `}`.
      if (pilha.pop() !== true) saida.push(c);
      i += 1;
      continue;
    }

    saida.push(c);
    i += 1;
  }

  return saida.join("");
}

function ehAtRuleLayer(css: string, i: number): boolean {
  if (!css.startsWith("@layer", i)) return false;
  // Evita casar um `@layers`/`@layer-algo` hipotético.
  const seguinte = css[i + "@layer".length];
  return seguinte === undefined || !/[\w-]/.test(seguinte);
}

/** Primeiro `{` ou `;` a partir de `i`, ignorando strings e comentários. */
function proximoDelimitador(css: string, i: number): number {
  while (i < css.length) {
    const c = css[i];
    if (c === "{" || c === ";") return i;
    if (c === "/" && css[i + 1] === "*") {
      const fim = css.indexOf("*/", i + 2);
      i = fim === -1 ? css.length : fim + 2;
      continue;
    }
    if (c === '"' || c === "'") {
      i = fimDaString(css, i);
      continue;
    }
    i += 1;
  }
  return -1;
}

/** Índice logo depois da aspa de fechamento da string que começa em `abertura`. */
function fimDaString(css: string, abertura: number): number {
  const aspa = css[abertura];
  let i = abertura + 1;
  while (i < css.length) {
    if (css[i] === "\\") {
      i += 2;
      continue;
    }
    if (css[i] === aspa) return i + 1;
    i += 1;
  }
  return css.length;
}

export function pluginAchatarCamadasCss(): Plugin {
  return {
    name: "achatar-camadas-css",
    // `post` pra rodar depois do Tailwind e da minificação: o que chega aqui
    // é exatamente o CSS que vai pro disco.
    enforce: "post",
    generateBundle(_opcoes, bundle) {
      for (const arquivo of Object.values(bundle)) {
        if (arquivo.type !== "asset" || !arquivo.fileName.endsWith(".css")) continue;
        const fonte =
          typeof arquivo.source === "string"
            ? arquivo.source
            : new TextDecoder().decode(arquivo.source);
        arquivo.source = achatarCamadas(fonte);
      }
    },
  };
}
