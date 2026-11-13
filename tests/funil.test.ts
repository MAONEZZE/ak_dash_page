import { expect, it } from "vitest";
import { somarContas } from "../src/lib/funil";
import { METRICAS_CONTA, type ContaFunil, type MetricasConta } from "../src/lib/tipos-api";

function metricas(parcial: Partial<MetricasConta>): MetricasConta {
  const zeros = Object.fromEntries(METRICAS_CONTA.map((k) => [k, 0])) as MetricasConta;
  return { ...zeros, ...parcial };
}

it("somarContas soma todas as contas e filtra pela conta escolhida", () => {
  const contas: ContaFunil[] = [
    { id_conta: "1", nome: "Jacob", metricas: metricas({ conexoes_enviadas: 381, numeros_captados: 19 }) },
    { id_conta: "2", nome: "Jonathan", metricas: metricas({ conexoes_enviadas: 383, numeros_captados: 19 }) },
  ];

  const todas = somarContas(contas, null);
  const jonathan = somarContas(contas, "Jonathan");
  const inexistente = somarContas(contas, "Inexistente");

  expect(todas.conexoes_enviadas).toBe(764);
  expect(todas.numeros_captados).toBe(38);
  expect(jonathan.conexoes_enviadas).toBe(383);
  expect(jonathan.numeros_captados).toBe(19);
  expect(inexistente.conexoes_enviadas).toBe(764);
  expect(inexistente.numeros_captados).toBe(38);
  expect(Object.keys(todas).sort()).toEqual([...METRICAS_CONTA].sort());
});
