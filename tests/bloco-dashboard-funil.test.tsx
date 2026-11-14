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

it("mostra um card por métrica em Diário, Semanal e Mensal com realizado, meta e % de atingimento", () => {
  const { unmount } = render(
    <BlocoDashboardFunil dashboard={dashboard} diasUteisRestantes={{ semanal: 0, mensal: 11 }} />,
  );

  expect(screen.getByRole("heading", { level: 2, name: "Dashboard · Lucas" })).toBeTruthy();

  const diario = screen.getByRole("list", { name: "Diário" });
  const semanal = screen.getByRole("list", { name: "Semanal" });
  const mensal = screen.getByRole("list", { name: "Mensal" });

  expect(within(diario).getAllByRole("listitem")).toHaveLength(1);
  expect(within(semanal).getAllByRole("listitem")).toHaveLength(1);
  expect(within(mensal).getAllByRole("listitem")).toHaveLength(2);

  const cardDiario = within(diario).getAllByRole("listitem")[0];
  expect(cardDiario.textContent).toContain("Números Captados");
  expect(cardDiario.textContent).toContain("/ 21");
  expect(cardDiario.textContent).toContain("9,5%");
  const progressoDiario = within(cardDiario).getByRole("progressbar");
  expect(progressoDiario.getAttribute("aria-valuenow")).toBe("2");
  expect(progressoDiario.getAttribute("aria-valuemax")).toBe("21");
  expect(cardDiario.querySelector(".barra-preenchimento")?.classList.contains("bg-bad")).toBe(true);

  const cardIndicacoes = within(mensal).getAllByRole("listitem")[1];
  expect(cardIndicacoes.textContent).toContain("Indicações Captadas");
  expect(cardIndicacoes.textContent).toContain("/ 0");
  expect(cardIndicacoes.textContent).not.toContain("%");
  expect(cardIndicacoes.querySelector(".barra-preenchimento")?.classList.contains("bg-aberta")).toBe(true);

  expect(screen.queryAllByRole("table")).toHaveLength(0);

  unmount();

  render(<BlocoDashboardFunil dashboard={{ ...dashboard, seller: null }} />);

  expect(screen.getByText("Nenhum seller ligado a este canal.")).toBeTruthy();
  expect(screen.queryAllByRole("list")).toHaveLength(0);
});
