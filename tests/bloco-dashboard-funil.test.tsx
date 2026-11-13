// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BlocoDashboardFunil } from "../src/componentes/BlocoDashboardFunil";
import type { DashboardFunil, MetricaTime } from "../src/lib/tipos-api";

afterEach(cleanup);

const numerosCaptados: MetricaTime = {
  metrica: "numeros_captados",
  nome_exibicao: "Números Captados",
  meta_periodo: 21,
  realizado: 2,
  pct_atingimento: 9.5,
  falta_folga: { tipo: "falta", valor: 19 },
  horas_restantes: 6.3,
  media_necessaria: { valor: 3, unidade: "hora", situacao: "pendente" },
  previsao: null,
};

const dashboard: DashboardFunil = {
  seller: { id_user: "13", nome: "Lucas" },
  diario: [numerosCaptados],
  semanal: [{ ...numerosCaptados, meta_periodo: 105, realizado: 15 }],
  mensal: [
    { ...numerosCaptados, meta_periodo: 441, realizado: 33, previsao: 69.3 },
    {
      metrica: "indicacoes",
      nome_exibicao: "Indicações Captadas",
      meta_periodo: 0,
      realizado: 0,
      pct_atingimento: null,
      falta_folga: { tipo: "folga", valor: 0 },
      horas_restantes: null,
      media_necessaria: { valor: null, unidade: "dia", situacao: "meta_batida" },
      previsao: null,
    },
  ],
};

const cabecalhos = (tabela: HTMLElement) =>
  within(tabela)
    .getAllByRole("columnheader")
    .map((th) => th.textContent);

it("renderiza as três tabelas com as colunas da aba Dashboard", () => {
  const { unmount } = render(
    <BlocoDashboardFunil dashboard={dashboard} diasUteisRestantes={{ semanal: 0, mensal: 11 }} />,
  );

  expect(screen.getByRole("heading", { level: 2, name: "Dashboard · Lucas" })).toBeTruthy();

  const diario = screen.getByRole("table", { name: "Diário" });
  const semanal = screen.getByRole("table", { name: "Semanal" });
  const mensal = screen.getByRole("table", { name: "Mensal" });

  expect(cabecalhos(diario)).toEqual([
    "Métrica",
    "Meta",
    "Realizado",
    "% de atingimento",
    "Falta / Folga",
    "Horas restantes",
    "Média necessária por hora",
  ]);
  expect(cabecalhos(semanal)).toEqual([
    "Métrica",
    "Meta",
    "Realizado",
    "% de atingimento",
    "Falta / Folga",
    "Dias úteis restantes",
    "Média necessária por dia",
  ]);
  expect(cabecalhos(mensal)).toEqual([
    "Métrica",
    "Meta",
    "Realizado",
    "% de atingimento",
    "Falta / Folga",
    "Dias úteis restantes",
    "Média necessária por dia",
    "Previsão",
  ]);

  expect(within(diario).getByText("Falta 19")).toBeTruthy();
  expect(within(diario).getByText("9,5%")).toBeTruthy();
  expect(within(diario).getByText("6,3")).toBeTruthy();

  expect(within(mensal).getAllByText("11")).toHaveLength(2);
  expect(within(mensal).getByText("Folga 0")).toBeTruthy();
  expect(within(mensal).getByText("Meta batida")).toBeTruthy();
  expect(within(mensal).getByText("69,3")).toBeTruthy();

  unmount();

  render(<BlocoDashboardFunil dashboard={{ ...dashboard, seller: null }} />);

  expect(screen.getByText("Nenhum seller ligado a este canal.")).toBeTruthy();
  expect(screen.queryAllByRole("table")).toHaveLength(0);
});
