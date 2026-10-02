import { describe, expect, it } from "vitest";
import { calcularRitmo } from "../src/lib/ritmo";

// Mês de 22 dias úteis — o formato que /comercial/* e /geral mandam em `dias_uteis`.
const MES = { decorridos: 11, total: 22 };

describe("calcularRitmo", () => {
  it("é sem_meta quando a meta é 0", () => {
    const r = calcularRitmo(50, 0, MES);
    expect(r.status).toBe("sem_meta");
    expect(r.projecao).toBeNull();
  });

  it("é sem_meta quando a meta não foi cadastrada (null)", () => {
    expect(calcularRitmo(50, null, MES).status).toBe("sem_meta");
  });

  it("no início do período ninguém está atrasado e não há projeção", () => {
    const r = calcularRitmo(0, 220, { decorridos: 0, total: 22 });
    expect(r.status).toBe("no_ritmo");
    expect(r.esperadoFrac).toBe(0);
    expect(r.esperadoHoje).toBe(0);
    expect(r.mediaPorDiaUtil).toBe(0);
    expect(r.projecao).toBeNull();
    expect(r.necessarioPorDiaUtil).toBe(10);
  });

  it("no último dia útil o necessário é o que falta, sem dividir por zero", () => {
    const r = calcularRitmo(200, 220, { decorridos: 22, total: 22 });
    expect(r.diasRestantes).toBe(0);
    expect(r.necessarioPorDiaUtil).toBe(20);
  });

  it("em período passado o esperado é a meta inteira e a projeção é o realizado", () => {
    const r = calcularRitmo(150, 220, { decorridos: 22, total: 22 });
    expect(r.esperadoFrac).toBe(1);
    expect(r.esperadoHoje).toBe(220);
    expect(r.projecao).toBe(150);
    expect(r.status).toBe("muito_atras");
  });

  it("em período futuro nada é esperado ainda", () => {
    const r = calcularRitmo(0, 220, { decorridos: 0, total: 21 });
    expect(r.esperadoHoje).toBe(0);
    expect(r.status).toBe("no_ritmo");
  });

  it("com realizado acima da meta fica no ritmo e não falta nada", () => {
    const r = calcularRitmo(300, 220, MES);
    expect(r.status).toBe("no_ritmo");
    expect(r.necessarioPorDiaUtil).toBe(0);
    expect(r.projecao).toBe(600);
  });

  it("no meio do mês projeta a média por dia útil até o fim", () => {
    const r = calcularRitmo(55, 220, MES);
    expect(r.esperadoFrac).toBe(0.5);
    expect(r.esperadoHoje).toBe(110);
    expect(r.mediaPorDiaUtil).toBe(5);
    expect(r.projecao).toBe(110);
    expect(r.necessarioPorDiaUtil).toBe(15);
  });

  it.each([
    [110, "no_ritmo"],
    [88, "atras"],
    [87, "muito_atras"],
  ] as const)("realizado %d com esperado 110 é %s", (realizado, status) => {
    expect(calcularRitmo(realizado, 220, MES).status).toBe(status);
  });

  it("período sem nenhum dia útil não gera NaN", () => {
    const r = calcularRitmo(0, 10, { decorridos: 0, total: 0 });
    expect(r.esperadoFrac).toBe(0);
    expect(Number.isNaN(r.necessarioPorDiaUtil)).toBe(false);
  });
});
