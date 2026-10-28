import { expect, it } from "vitest";
import { COR_TEXTO, statusDoAtingimento } from "../src/lib/atingimento";

it.each([
  { pct: 0, esperado: "muito_atras" },
  { pct: 33.2, esperado: "muito_atras" },
  { pct: 33.3, esperado: "atras" },
  { pct: 66.6, esperado: "atras" },
  { pct: 66.7, esperado: "no_ritmo" },
  { pct: 100, esperado: "no_ritmo" },
  { pct: 150, esperado: "no_ritmo" },
  { pct: null, esperado: "sem_meta" },
])("statusDoAtingimento classifica o % em terços da meta: $pct → $esperado", ({ pct, esperado }) => {
  expect(statusDoAtingimento(pct)).toBe(esperado);
});

it("COR_TEXTO dá a classe de texto de cada faixa", () => {
  expect(COR_TEXTO.muito_atras).toBe("text-bad");
  expect(COR_TEXTO.atras).toBe("text-warn");
  expect(COR_TEXTO.no_ritmo).toBe("text-ok");
  expect(COR_TEXTO.sem_meta).toBe("text-muted");
});
