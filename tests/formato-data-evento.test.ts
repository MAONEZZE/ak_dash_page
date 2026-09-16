import { describe, expect, it } from "vitest";
import { formatarDataHoraEvento } from "../src/lib/formato";

// `SED.events.event_date` viaja em UTC. A versão anterior fatiava a string e
// exibia os dígitos crus, adiantando o horário do card em 3h.
describe("formatarDataHoraEvento", () => {
  it("converte UTC para horário de São Paulo (coluna `timestamp`, sem fuso)", () => {
    expect(formatarDataHoraEvento("2026-09-20T19:00:00")).toBe("20/09 · 16:00");
  });

  it("aceita o formato com offset (coluna já migrada para `timestamptz`)", () => {
    expect(formatarDataHoraEvento("2026-09-20T19:00:00+00:00")).toBe("20/09 · 16:00");
  });

  it("os dois formatos do mesmo instante produzem o mesmo texto", () => {
    expect(formatarDataHoraEvento("2026-09-20T19:00:00")).toBe(
      formatarDataHoraEvento("2026-09-20T19:00:00Z"),
    );
  });

  // Vira o dia para trás: 01:00 UTC ainda é 22:00 do dia anterior em SP.
  it("respeita a virada de dia na conversão", () => {
    expect(formatarDataHoraEvento("2026-09-21T01:00:00")).toBe("20/09 · 22:00");
  });

  it("meia-noite em São Paulo sai como 00:00, nunca 24:00", () => {
    expect(formatarDataHoraEvento("2026-09-21T03:00:00")).toBe("21/09 · 00:00");
  });

  it("devolve vazio para valor inválido em vez de quebrar o card", () => {
    expect(formatarDataHoraEvento("nao-e-data")).toBe("");
  });
});
