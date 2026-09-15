// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardEventoRotativo } from "../src/componentes/CardEventoRotativo";
import type { EventoGeral } from "../src/lib/tipos-api";

const EVENTOS: EventoGeral[] = [
  { id: "a", titulo: "Imersão Akeel", data: "2026-09-20T19:00:00", capacidade: 50, inscritos: 31, aprovados: 12 },
  { id: "b", titulo: "Workshop SDR", data: "2026-09-27T09:30:00", capacidade: 20, inscritos: 8, aprovados: 3 },
  { id: "c", titulo: "Mentoria", data: "2026-10-02T14:00:00", capacidade: null, inscritos: 5, aprovados: 0 },
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function avancar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("CardEventoRotativo", () => {
  it("mostra título, data, contagem e capacidade do primeiro evento", () => {
    render(<CardEventoRotativo label="Inscritos" campo="inscritos" eventos={EVENTOS} />);
    expect(screen.getByText("Imersão Akeel")).toBeTruthy();
    expect(screen.getByText("20/09 · 19:00")).toBeTruthy();
    expect(screen.getByText("31")).toBeTruthy();
    expect(screen.getByText("/ 50")).toBeTruthy();
  });

  it("card de aprovados mostra os aprovados, não os inscritos, e sem denominador de capacidade", () => {
    render(<CardEventoRotativo label="Aprovados" campo="aprovados" eventos={EVENTOS} />);
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.queryByText("/ 50")).toBeNull();
  });

  it("gira pro próximo evento a cada 5s e volta pro primeiro depois do último", () => {
    vi.useFakeTimers();
    render(<CardEventoRotativo label="Inscritos" campo="inscritos" eventos={EVENTOS} />);

    avancar(5_000);
    expect(screen.getByText("Workshop SDR")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();

    avancar(5_000);
    expect(screen.getByText("Mentoria")).toBeTruthy();

    avancar(5_000);
    expect(screen.getByText("Imersão Akeel")).toBeTruthy();
  });

  it("uma barra por evento: a do evento em tela enche, as anteriores ficam cheias e as seguintes vazias", () => {
    vi.useFakeTimers();
    const { container } = render(<CardEventoRotativo label="Inscritos" campo="inscritos" eventos={EVENTOS} />);

    const barras = () => Array.from(container.querySelectorAll<HTMLElement>(".bg-offwhite\\/18 > div"));
    expect(barras()).toHaveLength(3);
    expect(barras()[0].className).toContain("barra-evento-preenchendo");
    expect(barras()[1].className).toContain("w-0");
    expect(barras()[2].className).toContain("w-0");

    avancar(5_000);
    expect(barras()[0].className).toContain("w-full");
    expect(barras()[1].className).toContain("barra-evento-preenchendo");
    expect(barras()[2].className).toContain("w-0");
  });

  it("capacidade não cadastrada vira travessão, sem quebrar o card", () => {
    vi.useFakeTimers();
    render(<CardEventoRotativo label="Inscritos" campo="inscritos" eventos={EVENTOS} />);
    avancar(10_000);
    expect(screen.getByText("Mentoria")).toBeTruthy();
    expect(screen.getByText("/ —")).toBeTruthy();
  });

  it("sem evento futuro mostra estado vazio, sem barras", () => {
    const { container } = render(<CardEventoRotativo label="Inscritos" campo="inscritos" eventos={[]} />);
    expect(screen.getByText("Sem eventos futuros")).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    expect(container.querySelectorAll(".barra-evento-preenchendo")).toHaveLength(0);
  });

  it("um único evento não gira — nada muda depois de 5s", () => {
    vi.useFakeTimers();
    render(<CardEventoRotativo label="Inscritos" campo="inscritos" eventos={[EVENTOS[0]]} />);
    avancar(15_000);
    expect(screen.getByText("Imersão Akeel")).toBeTruthy();
  });
});
