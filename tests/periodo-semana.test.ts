import { describe, expect, it } from "vitest";
import { semanaIso } from "../src/lib/periodo";

describe("semanaIso", () => {
  it("rotula a semana ISO do dia (segunda a domingo)", () => {
    // 14/09 (seg) a 20/09/2026 (dom) são todos a semana 38.
    expect(semanaIso(new Date(2026, 8, 14))).toBe("2026-W38");
    expect(semanaIso(new Date(2026, 8, 15))).toBe("2026-W38");
    expect(semanaIso(new Date(2026, 8, 20))).toBe("2026-W38");
  });

  it("domingo fecha a semana e segunda abre a seguinte", () => {
    expect(semanaIso(new Date(2026, 8, 20))).toBe("2026-W38");
    expect(semanaIso(new Date(2026, 8, 21))).toBe("2026-W39");
  });

  it("virada de ano segue o calendário ISO, não o civil", () => {
    // Mesma regra do BFF (`periodo.py::semana_iso`): 31/12/2025 é semana 1 de 2026.
    expect(semanaIso(new Date(2025, 11, 31))).toBe("2026-W01");
    expect(semanaIso(new Date(2027, 0, 1))).toBe("2026-W53");
  });

  it("sempre com dois dígitos na semana", () => {
    expect(semanaIso(new Date(2026, 0, 8))).toBe("2026-W02");
  });
});
