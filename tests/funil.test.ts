import { expect, it } from "vitest";
import { formatarTaxa, somarContas, taxasLinkedin, umaCasa } from "../src/lib/funil";
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

it("taxasLinkedin bate com o painel da planilha e devolve null em divisão por zero", () => {
  const totais = metricas({
    conexoes_enviadas: 1621,
    conexoes_aceitas: 940,
    mensagens_abordagem: 840,
    follows_abordagem: 713,
    respondidos: 482,
    numeros_captados: 89,
  });
  const zeros = metricas({});

  const t = taxasLinkedin(totais);

  expect(formatarTaxa(t.aceitacao)).toBe("58,0%");
  expect(formatarTaxa(t.abordados)).toBe("89,4%");
  expect(formatarTaxa(t.resposta)).toBe("57,4%");
  expect(formatarTaxa(t.conversaoNumero)).toBe("18,5%");
  expect(formatarTaxa(t.conversaoTotal)).toBe("5,5%");
  expect(umaCasa(t.followsPorAbordagem)).toBe("0,8");

  const z = taxasLinkedin(zeros);

  expect(z.aceitacao).toBeNull();
  expect(z.abordados).toBeNull();
  expect(z.resposta).toBeNull();
  expect(z.conversaoNumero).toBeNull();
  expect(z.conversaoTotal).toBeNull();
  expect(z.followsPorAbordagem).toBeNull();
  expect(formatarTaxa(null)).toBe("—");
  expect(umaCasa(null)).toBe("—");
});
