import { LogOut, Menu, Moon, RefreshCw, Sun, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AtualizacaoProvider, useAtualizacao } from "./lib/atualizacao";
import { useAuth } from "./lib/auth";
import { formatarHora } from "./lib/formato";
import { useDefinirGranularidade, useFiltrosAtuais, useNavegarMes } from "./lib/periodo";
import { SomProvider, useSom } from "./lib/som";
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

const MES_ROTULO = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

/** Navegação de mês passado da Financeiro (`‹ Setembro 2026 ›`) — só aparece sob granularidade Mês. */
function PillPeriodoNavegavel() {
  const { mes, podeVoltar, podeAvancar, voltar, avancar } = useNavegarMes();
  const [ano, mesNum] = mes.split("-").map(Number);
  const rotulo = MES_ROTULO.format(new Date(ano, mesNum - 1, 1));

  return (
    <div className="glass-pill flex items-center gap-1 p-1" role="group" aria-label="Mês">
      <button
        type="button"
        onClick={voltar}
        disabled={!podeVoltar}
        aria-label="Mês anterior"
        className="pill disabled:pointer-events-none disabled:opacity-40"
      >
        ‹
      </button>
      <span className="px-2 text-[15px] font-semibold capitalize">{rotulo}</span>
      <button
        type="button"
        onClick={avancar}
        disabled={!podeAvancar}
        aria-label="Próximo mês"
        className="pill disabled:pointer-events-none disabled:opacity-40"
      >
        ›
      </button>
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
 * Ícone solto no header (não some no menu — precisa estar visível o tempo
 * todo pra quem olha pra TV). Destacado enquanto o navegador ainda não
 * autorizou áudio: o clique nesse estado libera o áudio em vez de mutar.
 */
function BotaoSom() {
  const { ligado, liberado, alternar } = useSom();
  const precisaAtivar = ligado && !liberado;
  const rotulo = precisaAtivar ? "Clique para ativar o som" : ligado ? "Desativar som" : "Ativar som";

  return (
    <button
      type="button"
      onClick={() => void alternar()}
      aria-label={rotulo}
      title={rotulo}
      className={`glass-panel rounded-full p-2.5 hover:opacity-80 ${precisaAtivar ? "animate-pulse" : ""}`}
    >
      {ligado ? <Volume2 className="size-5" aria-hidden /> : <VolumeX className="size-5" aria-hidden />}
    </button>
  );
}

/**
 * Único botão de ação do header (onde antes ficava o logout): abre atualizar,
 * tema e sair. "Atualizar" só fica ativo na página que registrou um refresh
 * (ver lib/atualizacao).
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
  const { granularidade } = useFiltrosAtuais();

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
      <SomProvider>
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
                {granularidade === "mes" && <PillPeriodoNavegavel />}
                {location.pathname === "/comercial" && <PillSquad />}
                <BotaoSom />
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
      </SomProvider>
    </AtualizacaoProvider>
  );
}
