import { LogOut, Menu, Moon, RefreshCw, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AtualizacaoProvider, useAtualizacao } from "./lib/atualizacao";
import { useAuth } from "./lib/auth";
import { formatarHora } from "./lib/formato";
import { useDefinirGranularidade, useFiltrosAtuais } from "./lib/periodo";
import { SQUADS, useDefinirSquad, useSquadAtual } from "./lib/squad";
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

/** Filtro de squad da Comercial — vive aqui, à direita do período, e conversa com a página pela querystring. */
function PillSquad() {
  const squad = useSquadAtual();
  const definirSquad = useDefinirSquad();

  return (
    <div className="glass-pill flex gap-1 p-1" role="group" aria-label="Squad">
      {SQUADS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => definirSquad(s.id)}
          aria-pressed={squad === s.id}
          className={`pill ${squad === s.id ? "pill-ativo" : ""}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

const ITEM_MENU =
  "flex w-full items-center gap-2.5 px-4 py-3 text-left text-[15px] font-semibold transition-colors hover:bg-glass-border disabled:pointer-events-none disabled:opacity-45";

/**
 * Único botão de ação do header (onde antes ficava o logout): abre atualizar,
 * tema e sair. "Atualizar" só fica ativo na página que registrou um refresh
 * (ver lib/atualizacao) — a Financeiro é estática e não registra nada.
 */
function MenuAcoes({
  tema,
  alternarTema,
  aoSair,
}: {
  tema: Tema;
  alternarTema: () => void;
  aoSair: () => void;
}) {
  const { valor } = useAtualizacao();
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento: MouseEvent) {
      if (!container.current?.contains(evento.target as Node)) setAberto(false);
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberto(false);
    }

    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  return (
    <div className="relative" ref={container}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-label="Menu de ações"
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="glass-panel rounded-full p-2.5 hover:opacity-80"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-glass-border bg-bg-2 py-1 shadow-2xl"
        >
          <button
            type="button"
            role="menuitem"
            disabled={!valor.aoAtualizar || valor.atualizando}
            onClick={() => {
              valor.aoAtualizar?.();
              setAberto(false);
            }}
            className={ITEM_MENU}
          >
            <RefreshCw className={`size-[18px] shrink-0 ${valor.atualizando ? "animate-spin" : ""}`} aria-hidden />
            Atualizar
            {valor.atualizadoEm && <span className="ml-auto text-[13px] font-medium text-fg/55">{formatarHora(valor.atualizadoEm)}</span>}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              alternarTema();
              setAberto(false);
            }}
            className={ITEM_MENU}
          >
            {tema === "light" ? <Moon className="size-[18px] shrink-0" aria-hidden /> : <Sun className="size-[18px] shrink-0" aria-hidden />}
            {tema === "light" ? "Tema escuro" : "Tema claro"}
          </button>

          <button type="button" role="menuitem" onClick={aoSair} className={`${ITEM_MENU} text-perigo`}>
            <LogOut className="size-[18px] shrink-0" aria-hidden />
            Sair
          </button>
        </div>
      )}
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
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <PillNav />
              <PillPeriodo />
              {location.pathname === "/comercial" && <PillSquad />}
              <MenuAcoes tema={tema} alternarTema={alternarTema} aoSair={aoSair} />
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
