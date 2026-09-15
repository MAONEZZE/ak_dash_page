import { LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { UltimaAtualizacao } from "./componentes/UltimaAtualizacao";
import { AtualizacaoProvider, useAtualizacao } from "./lib/atualizacao";
import { useAuth } from "./lib/auth";
import { useDefinirGranularidade, useFiltrosAtuais } from "./lib/periodo";
import type { Granularidade } from "./lib/tipos-api";
import { Comercial } from "./paginas/Comercial";
import { Financeiro } from "./paginas/Financeiro";
import { Geral } from "./paginas/Geral";
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
  { rota: "/geral", rotulo: "Geral" },
  { rota: "/comercial", rotulo: "Comercial" },
  { rota: "/financeiro", rotulo: "Financeiro" },
];

const SUBTITULO_POR_ROTA: Record<string, string> = {
  "/geral": "Visão consolidada — comercial e financeiro",
  "/comercial": "Métricas diárias de prospecção — SDRs e closers",
  "/financeiro": "Caixa, margem e obrigações",
};

const GRANULARIDADES: { id: Granularidade; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
];

function PillNav() {
  const location = useLocation();

  return (
    <nav className="glass-pill flex gap-1 p-1" aria-label="Navegação">
      {NAV_ITENS.map((item) => (
        <NavLink
          key={item.rota}
          to={{ pathname: item.rota, search: location.search }}
          className={({ isActive }) => `pill ${isActive ? "pill-ativo" : ""}`}
        >
          {item.rotulo}
        </NavLink>
      ))}
    </nav>
  );
}

function PillPeriodo() {
  const { granularidade } = useFiltrosAtuais();
  const definirGranularidade = useDefinirGranularidade();

  return (
    <div className="glass-pill flex gap-1 p-1" role="group" aria-label="Período">
      {GRANULARIDADES.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => definirGranularidade(g.id)}
          aria-pressed={granularidade === g.id}
          className={`pill ${granularidade === g.id ? "pill-ativo" : ""}`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

/** Botão de tema + logout, e o "Atualizar" da página atual (se ela tiver registrado um) 10px à esquerda do toggle de tema. */
function AcoesHeader({
  tema,
  alternarTema,
  aoSair,
}: {
  tema: Tema;
  alternarTema: () => void;
  aoSair: () => void;
}) {
  const { valor } = useAtualizacao();

  return (
    <div className="flex items-center gap-2">
      {valor.aoAtualizar && (
        <div className="mr-[10px]">
          <UltimaAtualizacao atualizadoEm={valor.atualizadoEm ?? new Date()} atualizando={valor.atualizando} aoAtualizar={valor.aoAtualizar} />
        </div>
      )}
      <button
        type="button"
        onClick={alternarTema}
        aria-label={tema === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
        className="glass-panel rounded-full p-2 hover:opacity-80"
      >
        {tema === "light" ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
      </button>
      <button type="button" onClick={aoSair} aria-label="Sair" className="glass-panel rounded-full p-2 hover:opacity-80">
        <LogOut className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export default function App() {
  const [tema, alternarTema] = useTema();
  const { usuario, carregando, sair } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  if (!usuario) {
    return (
      <div className="min-h-screen bg-bg text-fg">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace state={{ de: location.pathname }} />} />
        </Routes>
      </div>
    );
  }

  const subtitulo = SUBTITULO_POR_ROTA[location.pathname] ?? "";

  return (
    <AtualizacaoProvider>
      <div className="dashboard-shell font-body text-fg">
        <div className="relative z-10 mx-auto flex h-full max-w-[var(--dashboard-max-width)] flex-col gap-5 px-6 py-6 sm:py-7">
          <header className="flex shrink-0 flex-wrap items-start justify-between gap-5">
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[29px] font-extrabold tracking-tight">akeel</span>
                <span className="inline-block size-[7px] rounded-full bg-accent-ink" />
              </div>
              <span className="text-[13px] text-fg/62">{subtitulo}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <PillNav />
              <PillPeriodo />
              <AcoesHeader tema={tema} alternarTema={alternarTema} aoSair={aoSair} />
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <Routes>
              <Route path="/login" element={<Navigate to="/comercial" replace />} />
              <Route path="/" element={<Navigate to="/comercial" replace />} />
              <Route path="/geral" element={<Geral />} />
              <Route path="/comercial" element={<Comercial />} />
              <Route path="/financeiro" element={<Financeiro />} />
            </Routes>
          </main>
        </div>
      </div>
    </AtualizacaoProvider>
  );
}
