// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/paginas/Comercial", () => ({ Comercial: () => <div>pagina-comercial</div> }));
vi.mock("../src/paginas/Financeiro", () => ({ Financeiro: () => <div>pagina-financeiro</div> }));

interface SessaoFake {
  access_token: string;
  user: { email: string };
}

type Callback = (evento: string, session: SessaoFake | null) => void;

function criarSupabaseMock(sessaoInicial: SessaoFake | null) {
  let sessaoAtual = sessaoInicial;
  let callback: Callback | null = null;

  const signOut = vi.fn().mockImplementation(async () => {
    sessaoAtual = null;
    callback?.("SIGNED_OUT", null);
    return { error: null };
  });

  return {
    _estado: () => sessaoAtual,
    auth: {
      getSession: vi.fn().mockImplementation(async () => ({ data: { session: sessaoAtual } })),
      onAuthStateChange: vi.fn().mockImplementation((cb: Callback) => {
        callback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithPassword: vi.fn().mockImplementation(async ({ email, password }: { email: string; password: string }) => {
        if (password === "errada") return { data: null, error: { message: "Invalid login credentials" } };
        sessaoAtual = { access_token: "token-fake", user: { email } };
        callback?.("SIGNED_IN", sessaoAtual);
        return { data: { session: sessaoAtual }, error: null };
      }),
      signOut,
    },
  };
}

async function montarApp(sessaoInicial: SessaoFake | null, rotaInicial = "/comercial") {
  vi.resetModules();
  const supabaseMock = criarSupabaseMock(sessaoInicial);
  vi.doMock("../src/lib/supabase", () => ({ supabase: supabaseMock }));

  const { AuthProvider } = await import("../src/lib/auth");
  const App = (await import("../src/App")).default;

  render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

  return supabaseMock;
}

describe("guarda de rota e sessão", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("sem sessão, /comercial redireciona para a tela de login", async () => {
    await montarApp(null, "/comercial");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy());
    expect(localStorage.getItem("ak_dash_token")).toBeNull();
  });

  it("com sessão, /comercial libera a página e grava o token", async () => {
    await montarApp({ access_token: "token-fake", user: { email: "pessoa@akeel.com.br" } }, "/comercial");
    await waitFor(() => expect(screen.getByText("pagina-comercial")).toBeTruthy());
    expect(localStorage.getItem("ak_dash_token")).toBe("token-fake");
  });

  it("logout limpa o token e volta para a tela de login", async () => {
    const supabaseMock = await montarApp({ access_token: "token-fake", user: { email: "pessoa@akeel.com.br" } }, "/comercial");
    await waitFor(() => expect(screen.getByText("pagina-comercial")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => expect(supabaseMock.auth.signOut).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy());
    expect(localStorage.getItem("ak_dash_token")).toBeNull();
  });

  it("401 do BFF força logout automaticamente, sem clique do usuário", async () => {
    const supabaseMock = await montarApp({ access_token: "token-fake", user: { email: "pessoa@akeel.com.br" } }, "/comercial");
    await waitFor(() => expect(screen.getByText("pagina-comercial")).toBeTruthy());

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ erro: { codigo: "nao_autenticado", mensagem: "token inválido" } }), { status: 401 }),
      );

    const { buscarPessoas } = await import("../src/lib/api");
    await expect(buscarPessoas()).rejects.toThrow();

    await waitFor(() => expect(supabaseMock.auth.signOut).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy());

    fetchMock.mockRestore();
  });
});
