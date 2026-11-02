// @vitest-environment jsdom
// O filtro de função (Todos/Sellers/SDRs/Closers) mora no header, logo à direita
// do filtro de data — e só nas páginas que filtram por função (Comercial e Time).
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/paginas/Comercial", () => ({ Comercial: () => <div>pagina-comercial</div> }));
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

async function montar(rota: string) {
  render(
    <MemoryRouter initialEntries={[rota]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
  await screen.findByRole("group", { name: "Período" });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("filtro de função no header", () => {
  it("navbar autenticada não exibe a marca akeel", async () => {
    await montar("/comercial");
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

  it.each(["/comercial", "/time"])("em %s fica no header, logo depois do filtro de data", async (rota) => {
    await montar(rota);
    const header = screen.getByRole("banner");
    const periodo = screen.getByRole("group", { name: "Período" });
    const funcao = screen.getByRole("group", { name: "Função" });

    expect(header.contains(funcao)).toBe(true);
    const grupos = Array.from(header.querySelectorAll('[role="group"]'));
    expect(grupos.indexOf(funcao)).toBe(grupos.indexOf(periodo) + 1);
  });

  it("não aparece nas páginas que não filtram por função", async () => {
    await montar("/financeiro");
    expect(screen.queryByRole("group", { name: "Função" })).toBeNull();
  });
});
