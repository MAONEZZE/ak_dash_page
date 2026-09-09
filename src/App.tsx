import { LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Comercial } from "./paginas/Comercial";
import { Financeiro } from "./paginas/Financeiro";
import { Login } from "./paginas/Login";

type Tema = "light" | "dark";
const CHAVE_TEMA = "ak_dash_tema";

function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(() => (localStorage.getItem(CHAVE_TEMA) as Tema | null) ?? "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem(CHAVE_TEMA, tema);
  }, [tema]);

  return [tema, () => setTema((t) => (t === "light" ? "dark" : "light"))];
}

const NAV_ITENS = [
  { rota: "/comercial", rotulo: "Comercial" },
  { rota: "/financeiro", rotulo: "Financeiro" },
];

export default function App() {
  const [tema, alternarTema] = useTema();
  const { usuario, carregando, sair } = useAuth();
  const navigate = useNavigate();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-fg/70">
        Carregando…
      </div>
    );
  }

  async function aoSair() {
    await sair();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      {usuario && (
        <header className="flex items-center justify-between border-b border-border-2 px-4 py-3 sm:px-6">
          <nav className="flex gap-1">
            {NAV_ITENS.map((item) => (
              <NavLink
                key={item.rota}
                to={item.rota}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? "bg-accent-fg text-bg-2" : "text-fg/80 hover:opacity-80"}`
                }
              >
                {item.rotulo}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={alternarTema}
              aria-label={tema === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
              className="rounded-md border border-border-2 p-2 hover:opacity-80"
            >
              {tema === "light" ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
            </button>
            <button
              type="button"
              onClick={aoSair}
              aria-label="Sair"
              className="rounded-md border border-border-2 p-2 hover:opacity-80"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </header>
      )}

      <main className={usuario ? "mx-auto max-w-5xl px-4 py-6 sm:px-6" : ""}>
        <Routes>
          <Route path="/login" element={usuario ? <Navigate to="/comercial" replace /> : <Login />} />
          <Route path="/" element={<Navigate to={usuario ? "/comercial" : "/login"} replace />} />
          <Route
            path="/comercial"
            element={usuario ? <Comercial /> : <Navigate to="/login" replace state={{ de: "/comercial" }} />}
          />
          <Route
            path="/financeiro"
            element={usuario ? <Financeiro /> : <Navigate to="/login" replace state={{ de: "/financeiro" }} />}
          />
        </Routes>
      </main>
    </div>
  );
}
