// @vitest-environment jsdom
// O filtro de função (Todos/Sellers/SDRs/Closers) mora no header, logo à direita
// do filtro de data — e só nas páginas que filtram por função (Time).
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/paginas/FunilLinkedin", () => ({ FunilLinkedin: () => <div>pagina-funil-linkedin</div> }));
vi.mock("../src/paginas/FunilInstagram", () => ({ FunilInstagram: () => <div>pagina-funil-instagram</div> }));
vi.mock("../src/paginas/FunilSdr", () => ({ FunilSdr: () => <div>pagina-funil-sdr</div> }));
vi.mock("../src/paginas/FunilEvento", () => ({ FunilEvento: () => <div>pagina-funil-evento</div> }));
vi.mock("../src/lib/api", async (orig) => ({
  ...(await orig<typeof import("../src/lib/api")>()),
  buscarEventosFunilEvento: vi.fn(async () => ({
    eventos: [{ id: "i2", titulo: "Imersão Alta Cadência", data: "2026-12-02T16:00:00+00:00" }],
    avisos: [],
  })),
  buscarEventosFunilSdr: vi.fn(async () => ({ eventos: [], avisos: [] })),
}));
vi.mock("../src/paginas/Geral", () => ({ Geral: () => <div>pagina-geral</div> }));
vi.mock("../src/paginas/Time", () => ({ Time: () => <div>pagina-time</div> }));
vi.mock("../src/paginas/Financeiro", () => ({ Financeiro: () => <div>pagina-financeiro</div> }));
vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { access_token: "t", user: { email: "a@x.com" } } } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

const { AuthProvider } = await import("../src/lib/auth");
const App = (await import("../src/App")).default;

function BuscaAtual() {
  const { search } = useLocation();
  return <span data-testid="busca-atual">{search}</span>;
}

async function montar(rota: string) {
  render(
    <MemoryRouter initialEntries={[rota]}>
      <AuthProvider>
        <App />
      </AuthProvider>
      <BuscaAtual />
    </MemoryRouter>,
  );
  await screen.findByRole("group", { name: "Período" });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("filtro de função no header", () => {
  it("navbar lista as sete páginas na ordem e a raiz abre a Geral", async () => {
    await montar("/");
    const navegacao = screen.getByRole("navigation", { name: "Navegação" });

    expect(within(navegacao).getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Funil LinkedIn",
      "Funil Instagram",
      "Funil SDR",
      "Funil Evento",
      "Geral",
      "Financeiro",
      "Time",
    ]);
    expect(await screen.findByText("pagina-geral")).toBeTruthy();

    cleanup();
    await montar("/funil-instagram");
    expect(screen.getByText("pagina-funil-instagram")).toBeTruthy();
  });

  it("funil evento: item no menu após o Funil SDR, abre a página e habilita o filtro de evento com as Imersões", async () => {
    await montar("/funil-evento?granularidade=mes");
    fireEvent.click(screen.getByRole("button", { name: "Evento: Próximo evento" }));

    expect(screen.getByText("pagina-funil-evento")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Evento: Próximo evento" }) as HTMLButtonElement).disabled).toBe(false);
    expect(await screen.findByText("Imersão Alta Cadência")).toBeTruthy();

    const navegacao = screen.getByRole("navigation", { name: "Navegação" });
    const rotulos = within(navegacao).getAllByRole("link").map((l) => l.textContent);
    expect(rotulos[rotulos.indexOf("Funil SDR") + 1]).toBe("Funil Evento");
  });

  it("abas das páginas ficam na barra lateral e os filtros continuam na navbar", async () => {
    await montar("/geral?granularidade=mes&periodo=2026-11");
    const lateral = screen.getByRole("complementary", { name: "Páginas" });
    const header = screen.getByRole("banner");

    const navegacao = within(lateral).getByRole("navigation", { name: "Navegação" });
    expect(within(header).queryByRole("navigation")).toBeNull();
    expect(within(header).getByRole("group", { name: "Período" })).toBeTruthy();
    expect(within(header).getByRole("group", { name: "Mês" })).toBeTruthy();

    const ativo = within(navegacao).getByRole("link", { name: "Geral" });
    expect(ativo.getAttribute("aria-current")).toBe("page");

    fireEvent.click(within(navegacao).getByRole("link", { name: "Financeiro" }));
    expect(await screen.findByText("pagina-financeiro")).toBeTruthy();
    expect(screen.getByTestId("busca-atual").textContent).toBe("?granularidade=mes&periodo=2026-11");
  });

  it("o menu lateral recolhe e expande, e lembra a escolha ao recarregar", async () => {
    await montar("/geral");
    const lateral = screen.getByRole("complementary", { name: "Páginas" });
    const botao = within(lateral).getByRole("button", { name: "Recolher menu" });

    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(lateral.hasAttribute("data-recolhido")).toBe(false);

    fireEvent.click(botao);

    expect(lateral.getAttribute("data-recolhido")).toBe("true");
    const expandir = within(lateral).getByRole("button", { name: "Expandir menu" });
    expect(expandir.getAttribute("aria-expanded")).toBe("false");
    expect(within(lateral).getByRole("link", { name: "Financeiro" })).toBeTruthy();

    cleanup();
    await montar("/geral");
    expect(screen.getByRole("complementary", { name: "Páginas" }).getAttribute("data-recolhido")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Expandir menu" }));
    expect(screen.getByRole("complementary", { name: "Páginas" }).hasAttribute("data-recolhido")).toBe(false);
  });

  it("navbar autenticada não exibe a marca akeel", async () => {
    await montar("/geral");
    const header = screen.getByRole("banner");

    expect(within(header).queryByText("akeel", { exact: true })).toBeNull();
    expect(header.querySelector(".bg-brand")).toBeNull();
  });

  it("seletor de mês permanece visível e só habilita na granularidade Mês", async () => {
    const casos = [
      ["/financeiro?granularidade=dia", false],
      ["/financeiro?granularidade=semana", false],
      ["/financeiro?granularidade=ano", false],
      ["/financeiro?granularidade=custom&periodo=2026-10-01..2026-10-15", false],
      ["/financeiro?granularidade=mes", true],
    ] as const;
    const mesAtual = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());

    for (const [rota, habilitado] of casos) {
      cleanup();
      await montar(rota);
      const grupo = screen.getByRole("group", { name: "Mês" });
      const anterior = within(grupo).getByRole("button", { name: "Mês anterior" });
      const proximo = within(grupo).getByRole("button", { name: "Próximo mês" });

      expect(grupo.getAttribute("aria-disabled")).toBe(String(!habilitado));
      expect(anterior.disabled).toBe(!habilitado);
      if (!habilitado) {
        expect(proximo.disabled).toBe(true);
        expect(grupo.textContent?.toLocaleLowerCase()).toContain(mesAtual.toLocaleLowerCase());
      }
    }
  });

  it.each(["/time"])("em %s fica no header, logo depois do filtro de data", async (rota) => {
    await montar(rota);
    const header = screen.getByRole("banner");
    const periodo = screen.getByRole("group", { name: "Período" });
    const funcao = screen.getByRole("group", { name: "Função" });

    expect(header.contains(funcao)).toBe(true);
    const grupos = Array.from(header.querySelectorAll('[role="group"]'));
    expect(grupos.indexOf(funcao)).toBe(grupos.indexOf(periodo) + 1);
  });

  it.each([
    ["/time", true],
    ["/funil-linkedin", false],
    ["/funil-instagram", false],
    ["/geral", false],
    ["/financeiro", false],
  ] as const)("filtro de função permanece visível e só habilita na Time (%s)", async (rota, habilitado) => {
    cleanup();
    await montar(rota);
    const header = screen.getByRole("banner");
    const periodo = screen.getByRole("group", { name: "Período" });
    const funcao = screen.getByRole("group", { name: "Função" });
    const botao = within(funcao).getByRole("button");

    expect(header.contains(funcao)).toBe(true);
    const grupos = Array.from(header.querySelectorAll('[role="group"]'));
    expect(grupos.indexOf(funcao)).toBe(grupos.indexOf(periodo) + 1);
    expect(botao.disabled).toBe(!habilitado);

    const buscaAntes = screen.getByTestId("busca-atual").textContent;
    fireEvent.click(botao);
    if (habilitado) {
      expect(botao.getAttribute("aria-expanded")).toBe("true");
      expect(within(funcao).getAllByRole("checkbox")).toHaveLength(3);
    } else {
      expect(botao.getAttribute("aria-expanded")).toBe("false");
      expect(within(funcao).queryByRole("checkbox")).toBeNull();
      expect(screen.getByTestId("busca-atual").textContent).toBe(buscaAntes);
    }
  });
});
