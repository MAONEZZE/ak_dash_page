// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PillEvento } from "../src/componentes/PillEvento";
import { buscarEventosFunilSdr } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({ buscarEventosFunilSdr: vi.fn() }));

beforeEach(() => {
  vi.mocked(buscarEventosFunilSdr).mockResolvedValue({
    eventos: [
      { id: "e2", titulo: "Confraria Akeel SP", data: "2026-11-20T22:00:00" },
      { id: "e1", titulo: "Confraria Akeel RJ", data: "2026-10-10T22:00:00" },
    ],
    avisos: [],
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function Busca() {
  return <output data-testid="busca">{useLocation().search}</output>;
}

function renderizar(disabled: boolean, url = "/funil-sdr?granularidade=mes") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <PillEvento disabled={disabled} />
      <Busca />
    </MemoryRouter>,
  );
}

it("escolher um evento grava o id na querystring sem perder os outros filtros", async () => {
  renderizar(false);
  fireEvent.click(screen.getByRole("button", { name: "Evento: Próximo evento" }));
  fireEvent.click(await screen.findByRole("button", { name: /Confraria Akeel RJ/ }));

  expect(screen.getByTestId("busca").textContent).toBe("?granularidade=mes&evento=e1");
  expect(await screen.findByRole("button", { name: "Evento: Confraria Akeel RJ" })).toBeTruthy();
});

it("voltar para a próxima Confraria tira o evento da querystring", async () => {
  renderizar(false, "/funil-sdr?granularidade=mes&evento=e1");
  fireEvent.click(await screen.findByRole("button", { name: "Evento: Confraria Akeel RJ" }));
  fireEvent.click(screen.getByRole("button", { name: /Próximo evento/ }));

  expect(screen.getByTestId("busca").textContent).toBe("?granularidade=mes");
});

it("fora da página do SDR fica desabilitado e nem busca os eventos", () => {
  renderizar(true);
  expect((screen.getByRole("button", { name: "Evento: Próximo evento" }) as HTMLButtonElement).disabled).toBe(true);
  expect(buscarEventosFunilSdr).not.toHaveBeenCalled();
});
