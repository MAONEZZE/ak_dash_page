// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Velocimetro } from "../src/componentes/Velocimetro";

afterEach(cleanup);

function ponteiro(): SVGGElement | null {
  return document.querySelector("[data-ponteiro]");
}

function card(): HTMLElement {
  return screen.getByRole("meter").closest("[data-alerta]") as HTMLElement;
}

it("mostra realizado, meta e % com o arco proporcional ao atingimento", () => {
  render(<Velocimetro rotulo="Números Captados" valor={96} meta={154} />);

  const medidor = screen.getByRole("meter", { name: "Números Captados" });
  expect(medidor.getAttribute("aria-valuenow")).toBe("96");
  expect(medidor.getAttribute("aria-valuemax")).toBe("154");
  expect(medidor.textContent).toContain("96");
  expect(medidor.textContent).toContain("de 154");
  expect(medidor.textContent).toContain("62,3%");
  // 62,3% de 180° a partir de -90° (esquerda).
  expect(ponteiro()?.getAttribute("data-angulo")).toBe("22.2");
  expect(card().getAttribute("data-alerta")).toBe("atras");
});

it("acima da meta o arco fica cheio e o % passa de 100", () => {
  render(<Velocimetro rotulo="Números Captados" valor={30} meta={20} />);

  expect(screen.getByRole("meter").textContent).toContain("150,0%");
  expect(ponteiro()?.getAttribute("data-angulo")).toBe("90");
  expect(card().getAttribute("data-alerta")).toBe("no_ritmo");
});

it("meta 0 (nada a fazer) conta como atingida", () => {
  render(<Velocimetro rotulo="Inscrições Realizadas" valor={0} meta={0} />);
  const medidor = screen.getByRole("meter", { name: "Inscrições Realizadas" });
  expect(medidor.textContent).toContain("100");
  expect(medidor.textContent).not.toContain("Meta aberta");
});

it("sem meta mostra o realizado e 'Meta aberta', sem %", () => {
  render(<Velocimetro rotulo="Números Captados" valor={31} meta={null} />);

  const medidor = screen.getByRole("meter");
  expect(medidor.textContent).toContain("31");
  expect(medidor.textContent).toContain("Meta aberta");
  expect(medidor.textContent).not.toContain("%");
  expect(medidor.hasAttribute("aria-valuemax")).toBe(false);
  expect(ponteiro()).toBeNull();
  expect(card().getAttribute("data-alerta")).toBe("sem_meta");
});

it("arco tem as faixas vermelha, amarela e verde, e abaixo de 1/3 o card fica no alerta vermelho", () => {
  render(<Velocimetro rotulo="Números Captados" valor={10} meta={100} />);

  const faixas = [...document.querySelectorAll("[data-faixa]")].map((f) => f.getAttribute("class"));
  expect(faixas).toEqual(["stroke-bad opacity-25", "stroke-warn-bar opacity-25", "stroke-ok opacity-25"]);
  // Só a faixa vermelha recebe preenchimento, até os 10% marcados, com ponta redonda.
  const cheias = document.querySelectorAll("[data-faixa-cheia]");
  expect(cheias).toHaveLength(1);
  expect(cheias[0].getAttribute("class")).toBe("stroke-bad");
  expect(cheias[0].getAttribute("stroke-dasharray")).toBe("10 100");
  expect(cheias[0].getAttribute("stroke-linecap")).toBe("round");
  expect(ponteiro()?.getAttribute("data-angulo")).toBe("-72");
  expect(card().getAttribute("data-alerta")).toBe("muito_atras");
  expect(card().classList.contains("card-velocimetro")).toBe(true);
});
