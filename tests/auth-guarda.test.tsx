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

  // Renova o token como o supabase-js faz: mesma sessão, access_token novo.
  const refreshSession = vi.fn().mockImplementation(async () => {
    if (sessaoAtual === null) return { data: { session: null }, error: { message: "refresh_token_not_found" } };
    sessaoAtual = { ...sessaoAtual, access_token: "token-renovado" };
    callback?.("TOKEN_REFRESHED", sessaoAtual);
    return { data: { session: sessaoAtual }, error: null };
  });

  return {
    _estado: () => sessaoAtual,
    _expirarSessao: () => {
      sessaoAtual = null;
    },
    auth: {
      getSession: vi.fn().mockImplementation(async () => ({ data: { session: sessaoAtual } })),
      refreshSession,
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
  });

  it("com sessão, /comercial libera a página", async () => {
    await montarApp({ access_token: "token-fake", user: { email: "pessoa@akeel.com.br" } }, "/comercial");
    await waitFor(() => expect(screen.getByText("pagina-comercial")).toBeTruthy());
  });

  it("logout limpa o token e volta para a tela de login", async () => {
    const supabaseMock = await montarApp({ access_token: "token-fake", user: { email: "pessoa@akeel.com.br" } }, "/comercial");
    await waitFor(() => expect(screen.getByText("pagina-comercial")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => expect(supabaseMock.auth.signOut).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy());
  });

  // A TV fica ligada dias sem ninguém por perto e rebusca a cada 60s. Antes,
  // qualquer 401 disparava signOut() e a tela amanhecia no login. Estes três
  // testes travam o comportamento novo.
  it("401 renova o token e repete a requisição, sem derrubar a sessão", async () => {
    const supabaseMock = await montarApp({ access_token: "token-fake", user: { email: "pessoa@akeel.com.br" } }, "/comercial");
    await waitFor(() => expect(screen.getByText("pagina-comercial")).toBeTruthy());

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ erro: { codigo: "nao_autenticado", mensagem: "token inválido" } }), { status: 401 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: "1" }]), { status: 200 }));

    const { buscarPessoas } = await import("../src/lib/api");
    await expect(buscarPessoas()).resolves.toEqual([{ id: "1" }]);

    expect(supabaseMock.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(supabaseMock.auth.signOut).not.toHaveBeenCalled();
    // A repetição foi com o token novo, não com o que tomou 401.
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ headers: { Authorization: "Bearer token-renovado" } });
    expect(screen.getByText("pagina-comercial")).toBeTruthy();

    fetchMock.mockRestore();
  });

  it("401 que persiste depois da renovação vira erro, não logout", async () => {
    const supabaseMock = await montarApp({ access_token: "token-fake", user: { email: "pessoa@akeel.com.br" } }, "/comercial");
    await waitFor(() => expect(screen.getByText("pagina-comercial")).toBeTruthy());

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ erro: { codigo: "nao_autenticado", mensagem: "token inválido" } }), { status: 401 }),
      );

    const { buscarPessoas } = await import("../src/lib/api");
    await expect(buscarPessoas()).rejects.toThrow();

    // BFF recusando token recém-renovado é problema do BFF: a tela mostra erro
    // e tenta de novo em 60s. Derrubar a sessão aqui só trocaria o dashboard
    // por uma tela de login que, ao entrar, cairia no mesmo 401.
    expect(supabaseMock.auth.signOut).not.toHaveBeenCalled();
    expect(screen.getByText("pagina-comercial")).toBeTruthy();

    fetchMock.mockRestore();
  });

  it("sessão revogada pelo Supabase (SIGNED_OUT) volta para o login", async () => {
    const supabaseMock = await montarApp({ access_token: "token-fake", user: { email: "pessoa@akeel.com.br" } }, "/comercial");
    await waitFor(() => expect(screen.getByText("pagina-comercial")).toBeTruthy());

    // Único caminho que ainda encerra a sessão sozinho: o supabase-js
    // concluindo que o refresh token morreu.
    await supabaseMock.auth.signOut();

    await waitFor(() => expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy());
  });
});
