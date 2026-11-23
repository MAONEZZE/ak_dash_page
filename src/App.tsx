import {
  CalendarCheck,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Sun,
  Users,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AtualizacaoProvider, useAtualizacao } from "./lib/atualizacao";
import { useAuth } from "./lib/auth";
import { CalendarioIntervalo, formatarDataCurta } from "./componentes/CalendarioIntervalo";
import { LogoInstagram, LogoLinkedin } from "./componentes/IconesMarca";
import { PillEvento, useEventoSelecionado } from "./componentes/PillEvento";
import { PillSquad } from "./componentes/PillSquad";
import { buscarEventosFunilEvento, buscarEventosFunilSdr } from "./lib/api";
import { formatarHora } from "./lib/formato";
import { paraPeriodo, useDefinirGranularidade, useDefinirIntervalo, useFiltrosAtuais, useNavegarMes } from "./lib/periodo";
import { SomProvider, useSom } from "./lib/som";
import type { Granularidade } from "./lib/tipos-api";
import { Financeiro } from "./paginas/Financeiro";
import { FunilEvento } from "./paginas/FunilEvento";
import { FunilInstagram } from "./paginas/FunilInstagram";
import { FunilLinkedin } from "./paginas/FunilLinkedin";
import { FunilSdr } from "./paginas/FunilSdr";
import { Geral } from "./paginas/Geral";
import { Login } from "./paginas/Login";
import { Time } from "./paginas/Time";

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
  { rota: "/funil-linkedin", rotulo: "Funil LinkedIn", Icone: LogoLinkedin },
  { rota: "/funil-instagram", rotulo: "Funil Instagram", Icone: LogoInstagram },
  { rota: "/funil-sdr", rotulo: "Funil SDR", Icone: Headset },
  { rota: "/funil-evento", rotulo: "Funil Evento", Icone: CalendarCheck },
  { rota: "/geral", rotulo: "Geral", Icone: LayoutDashboard },
  { rota: "/financeiro", rotulo: "Financeiro", Icone: Wallet },
  { rota: "/time", rotulo: "Time", Icone: Users },
];

/** Páginas que filtram por função (Todos/Sellers/SDRs/Closers). */
const PAGINAS_COM_SQUAD = ["/time"];

/** Páginas que filtram por evento (evento do velocímetro e dos cards do evento). */
const PAGINAS_COM_EVENTO = ["/funil-sdr", "/funil-evento"];

const GRANULARIDADES:{ id: Granularidade; label: string }[] = [
  { id: "dia", label: "Dia" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mês" },
  { id: "ano", label: "Ano" },
];

const CHAVE_MENU_RECOLHIDO = "ak_dash_menu_recolhido";

function lerMenuRecolhido(): boolean {
  try {
    return localStorage.getItem(CHAVE_MENU_RECOLHIDO) === "1";
  } catch {
    return false;
  }
}

/**
 * Abas das páginas numa coluna à esquerda. Recolhida (ou abaixo de lg) mostra
 * só os ícones, com o rótulo pra leitor de tela e no tooltip. A escolha de
 * recolher fica no navegador.
 */
function BarraLateral() {
  const location = useLocation();
  const [recolhido, setRecolhido] = useState(lerMenuRecolhido);

  function alternar() {
    const novo = !recolhido;
    setRecolhido(novo);
    try {
      localStorage.setItem(CHAVE_MENU_RECOLHIDO, novo ? "1" : "0");
    } catch {
      // Sem storage (aba anônima/bloqueado): só não lembra a escolha.
    }
  }

  const rotuloVisivel = recolhido ? "sr-only" : "sr-only lg:not-sr-only";
  const IconeBotao = recolhido ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={`barra-lateral fixed inset-x-0 bottom-0 z-30 flex shrink-0 px-3 pt-2 md:static md:w-[72px] md:flex-col md:gap-3 md:py-4 md:transition-[width] md:duration-200 ${recolhido ? "" : "lg:w-60"}`}
      aria-label="Páginas"
      data-recolhido={recolhido ? "true" : undefined}
    >
      <nav className="flex w-full justify-around gap-1.5 md:flex-col md:justify-start" aria-label="Navegação">
        {NAV_ITENS.map(({ rota, rotulo, Icone }) => (
          <NavLink
            key={rota}
            to={{ pathname: rota, search: location.search }}
            title={rotulo}
            className={({ isActive }) => `aba-lateral ${isActive ? "aba-lateral-ativa" : ""}`}
          >
            <Icone className="size-5 shrink-0" aria-hidden />
            <span className={rotuloVisivel}>{rotulo}</span>
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={!recolhido}
        aria-label={recolhido ? "Expandir menu" : "Recolher menu"}
        title={recolhido ? "Expandir menu" : "Recolher menu"}
        className="aba-lateral mt-auto !hidden w-full cursor-pointer border-0 bg-transparent lg:!flex"
      >
        <IconeBotao className="size-5 shrink-0" aria-hidden />
        <span className={rotuloVisivel}>Recolher</span>
      </button>
    </aside>
  );
}

function PillPeriodo() {
  const { granularidade, periodo } = useFiltrosAtuais();
  const definirGranularidade = useDefinirGranularidade();
  const definirIntervalo = useDefinirIntervalo();
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const custom = granularidade === "custom";

  useEffect(() => {
    if (!calendarioAberto) return;
    function aoClicarFora(evento: MouseEvent) {
      if (!container.current?.contains(evento.target as Node)) setCalendarioAberto(false);
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setCalendarioAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [calendarioAberto]);

  const [inicio, fim] = custom ? periodo.split("..") : [];

  return (
    <div className="relative min-w-0 max-w-full" ref={container}>
      <div className="glass-pill flex max-w-full gap-1 overflow-x-auto p-1 *:shrink-0" role="group" aria-label="Período">
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
        <button
          type="button"
          onClick={() => setCalendarioAberto((a) => !a)}
          aria-pressed={custom}
          aria-haspopup="dialog"
          aria-expanded={calendarioAberto}
          className={`pill inline-flex items-center gap-1.5 ${custom ? "pill-ativo" : ""}`}
        >
          <CalendarRange className="size-4" aria-hidden />
          {custom ? `${formatarDataCurta(inicio)} – ${formatarDataCurta(fim)}` : <span className="sr-only sm:not-sr-only">Customizado</span>}
        </button>
      </div>
      {calendarioAberto && (
        <CalendarioIntervalo
          inicial={custom ? periodo : null}
          aoCancelar={() => setCalendarioAberto(false)}
          aoAplicar={(i, f) => {
            definirIntervalo(i, f);
            setCalendarioAberto(false);
          }}
        />
      )}
    </div>
  );
}

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MES_ROTULO = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

/** Seletor de mês com setas (`‹ Setembro 2026 ›`), habilitado sob granularidade Mês. */
function PillPeriodoNavegavel({ habilitado }: { habilitado: boolean }) {
  const { mes, podeVoltar, podeAvancar, voltar, avancar } = useNavegarMes();
  const mesExibido = habilitado ? mes : paraPeriodo("mes", new Date());
  const [ano, mesNum] = mesExibido.split("-").map(Number);
  const rotulo = MES_ROTULO.format(new Date(ano, mesNum - 1, 1));
  const rotuloCurto = `${MESES_CURTOS[mesNum - 1]}/${String(ano).slice(2)}`;

  return (
    <div className="glass-pill flex shrink-0 items-center gap-1 p-1" role="group" aria-label="Mês" aria-disabled={!habilitado}>
      <button
        type="button"
        onClick={voltar}
        disabled={!habilitado || !podeVoltar}
        aria-label="Mês anterior"
        className="pill !px-0 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <span className="px-0.5 text-center text-[13px] font-semibold capitalize sm:min-w-[9.5rem] sm:px-1 sm:text-[14px]" aria-live="polite">
        <span className="sm:hidden" aria-hidden>
          {rotuloCurto}
        </span>
        <span className="sr-only sm:not-sr-only">{rotulo}</span>
      </span>
      <button
        type="button"
        onClick={avancar}
        disabled={!habilitado || !podeAvancar}
        aria-label="Próximo mês"
        className="pill !px-0 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}

const ITEM_MENU =
  "flex min-h-11 w-full items-center gap-2.5 px-4 py-3 text-left text-[15px] font-semibold transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-45";

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
      className={`glass-pill inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2 ${precisaAtivar ? "animate-pulse" : ""}`}
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
        className="glass-pill inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl glass-flutuante py-1"
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
            {valor.atualizadoEm && <span className="ml-auto text-[13px] font-medium text-muted">{formatarHora(valor.atualizadoEm)}</span>}
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
  const { granularidade, periodo } = useFiltrosAtuais();
  const evento = useEventoSelecionado();

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
          <div className="relative z-10 mx-auto flex h-full max-w-[var(--dashboard-max-width)]">
            <BarraLateral />
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="cabecalho z-20 shrink-0 px-4 py-3 sm:px-6 md:sticky md:top-0">
                {/*
                 * Navbar: filtros no centro, som + menu à direita (as páginas ficam na barra lateral).
                 * Abaixo de lg os filtros descem pra uma segunda linha inteira.
                 */}
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2.5">
                  <div className="filtros-header order-last col-span-2 flex min-w-0 items-center gap-1.5 sm:flex-wrap sm:justify-center sm:gap-2.5 lg:order-none lg:col-span-1 lg:col-start-1">
                    <PillPeriodoNavegavel habilitado={granularidade === "mes"} />
                    <PillPeriodo />
                    {/* No celular o filtro de função só aparece onde ele vale. */}
                    <div className={PAGINAS_COM_SQUAD.includes(location.pathname) ? "shrink-0" : "hidden sm:block"}>
                      <PillSquad disabled={!PAGINAS_COM_SQUAD.includes(location.pathname)} />
                    </div>
                    <div className={PAGINAS_COM_EVENTO.includes(location.pathname) ? "shrink-0" : "hidden sm:block"}>
                      <PillEvento
                        disabled={!PAGINAS_COM_EVENTO.includes(location.pathname)}
                        buscar={location.pathname === "/funil-evento" ? buscarEventosFunilEvento : buscarEventosFunilSdr}
                      />
                    </div>
                  </div>
                  <div className="col-start-2 row-start-1 flex items-center justify-end gap-2">
                    <BotaoSom />
                    <MenuAcoes tema={tema} alternarTema={alternarTema} aoSair={aoSair} />
                  </div>
                </div>
              </header>

              <main className="px-4 pb-28 pt-5 sm:px-6 md:min-h-0 md:flex-1 md:overflow-y-auto md:pb-6">
                {/*
                 * Trocar um filtro que refaz a busca (período, mês, evento) remonta a
                 * página: o dado velho some e os componentes voltam ao esqueleto até
                 * a resposta nova chegar (e uma resposta atrasada do filtro anterior
                 * cai num componente desmontado, sem sobrescrever a nova). Filtros que
                 * só recortam o dado já carregado (conta, função) não entram na chave.
                 */}
                <Routes key={`${granularidade}|${periodo}|${evento ?? ""}`}>
                  <Route path="/login" element={<Navigate to="/geral" replace />} />
                  <Route path="/" element={<Navigate to="/geral" replace />} />
                  <Route path="/funil-linkedin" element={<FunilLinkedin />} />
                  <Route path="/funil-instagram" element={<FunilInstagram />} />
                  <Route path="/funil-sdr" element={<FunilSdr />} />
                  <Route path="/funil-evento" element={<FunilEvento />} />
                  <Route path="/geral" element={<Geral />} />
                  <Route path="/time" element={<Time />} />
                  <Route path="/financeiro" element={<Financeiro />} />
                </Routes>
              </main>
            </div>
          </div>
        </div>
      </SomProvider>
    </AtualizacaoProvider>
  );
}
