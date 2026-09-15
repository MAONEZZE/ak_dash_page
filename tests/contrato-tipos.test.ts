import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `src/lib/tipos-api.ts` é uma cópia de `docs/contract/types.ts` — os dois
 * já divergiram no passado (ver docs/contract/README.md). Esse teste falha
 * assim que alguém edita um sem editar o outro.
 */
describe("tipos-api.ts espelha docs/contract/types.ts", () => {
  it("tem conteúdo idêntico", () => {
    const fonte = readFileSync(join(__dirname, "..", "..", "docs", "contract", "types.ts"), "utf-8");
    const copia = readFileSync(join(__dirname, "..", "src", "lib", "tipos-api.ts"), "utf-8");
    expect(copia).toBe(fonte);
  });
});
