// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const entrarMock = vi.fn();

vi.mock("../src/lib/auth", () => ({
  useAuth: () => ({ entrar: entrarMock, usuario: null, carregando: false, sair: vi.fn() }),
}));

async function montarLogin() {
  const { Login } = await import("../src/paginas/Login");
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renderiza os campos de email e senha", async () => {
    await montarLogin();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Senha")).toBeTruthy();
  });

  it("chama entrar() com email e senha digitados", async () => {
    entrarMock.mockResolvedValue({ erro: null });
    await montarLogin();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "pessoa@akeel.com.br" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-correta" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(entrarMock).toHaveBeenCalledWith("pessoa@akeel.com.br", "senha-correta"));
  });

  it("mostra erro de credencial inválida sem navegar", async () => {
    entrarMock.mockResolvedValue({ erro: "Email ou senha inválidos." });
    await montarLogin();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "pessoa@akeel.com.br" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "errada" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Email ou senha inválidos."));
    expect(screen.getByLabelText("Email")).toBeTruthy();
  });
});
