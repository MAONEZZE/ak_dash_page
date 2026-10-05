import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

/**
 * Calendário de intervalo do filtro "Customizado": dois meses lado a lado. O
 * 1º clique marca o início, o 2º o fim (se vier antes do início, os dois
 * trocam) e um 3º recomeça. Início e fim viram círculos cheios e os dias entre
 * eles ganham uma faixa de destaque. Nada é aplicado até "Aplicar".
 *
 * Datas como string `AAAA-MM-DD` do calendário local — comparar string é
 * comparar data, e não há fuso no meio. Dia depois de hoje fica desabilitado:
 * não existe dado do futuro.
 */

const NOME_MES = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function hojeIso(): string {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatarDataCurta(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

interface Selecao {
  inicio: string | null;
  fim: string | null;
}

function Mes({
  ano,
  mes,
  selecao,
  hoje,
  aoEscolher,
}: {
  ano: number;
  mes: number;
  selecao: Selecao;
  hoje: string;
  aoEscolher: (dia: string) => void;
}) {
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const celulas: (number | null)[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];
  const { inicio, fim } = selecao;

  return (
    <div className="w-[252px]">
      <p className="mb-2 text-center text-[14px] font-semibold capitalize">{NOME_MES.format(new Date(ano, mes, 1))}</p>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {celulas.map((dia, i) => {
          if (dia === null) return <span key={`v${i}`} />;
          const data = iso(ano, mes, dia);
          const ehInicio = data === inicio;
          const ehFim = data === fim;
          const ponta = ehInicio || ehFim;
          const noMeio = inicio !== null && fim !== null && data > inicio && data < fim;
          const futuro = data > hoje;
          // A faixa de destaque passa por trás do círculo das pontas: metade
          // direita no início, metade esquerda no fim — o intervalo fica contínuo.
          const faixa = noMeio
            ? "bg-closer-bg"
            : ehInicio && fim && fim !== inicio
              ? "faixa-intervalo-inicio"
              : ehFim && inicio && fim !== inicio
                ? "faixa-intervalo-fim"
                : "";
          return (
            <div key={data} className={`flex h-9 items-center justify-center ${faixa}`} data-dia={data}>
              <button
                type="button"
                disabled={futuro}
                onClick={() => aoEscolher(data)}
                aria-label={formatarDataCurta(data)}
                aria-pressed={ponta}
                data-no-intervalo={noMeio || undefined}
                className={`size-9 rounded-full text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                  ponta ? "bg-closer text-surface" : noMeio ? "text-closer hover:bg-surface-2" : "hover:bg-surface-2"
                } ${data === hoje && !ponta ? "ring-1 ring-line" : ""}`}
              >
                {dia}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarioIntervalo({
  inicial,
  aoAplicar,
  aoCancelar,
}: {
  /** Intervalo já aplicado (`AAAA-MM-DD..AAAA-MM-DD`), se houver — reabre o calendário nele. */
  inicial: string | null;
  aoAplicar: (inicio: string, fim: string) => void;
  aoCancelar: () => void;
}) {
  const hoje = hojeIso();
  const [inicioInicial, fimInicial] = inicial ? inicial.split("..") : [null, null];
  const [selecao, setSelecao] = useState<Selecao>({ inicio: inicioInicial, fim: fimInicial });
  // O mês da DIREITA abre no mês do fim selecionado (ou no mês corrente).
  const [anoRef, mesRef] = (fimInicial ?? hoje).split("-").map(Number);
  const [direita, setDireita] = useState({ ano: anoRef, mes: mesRef - 1 });
  const esquerda = direita.mes === 0 ? { ano: direita.ano - 1, mes: 11 } : { ano: direita.ano, mes: direita.mes - 1 };
  const [anoHoje, mesHoje] = hoje.split("-").map(Number);
  const podeAvancar = direita.ano * 12 + direita.mes < anoHoje * 12 + mesHoje - 1;

  function escolher(dia: string) {
    setSelecao(({ inicio, fim }) => {
      if (inicio === null || fim !== null) return { inicio: dia, fim: null };
      return dia < inicio ? { inicio: dia, fim: inicio } : { inicio, fim: dia };
    });
  }

  function mover(delta: number) {
    setDireita(({ ano, mes }) => {
      const total = ano * 12 + mes + delta;
      return { ano: Math.floor(total / 12), mes: total % 12 };
    });
  }

  const { inicio, fim } = selecao;

  return (
    <div
      role="dialog"
      aria-label="Escolher intervalo de datas"
      className="absolute right-0 top-[calc(100%+10px)] z-50 max-h-[calc(100vh-140px)] overflow-y-auto rounded-3xl glass-flutuante p-4 text-fg"
    >
      {/* Celular: os dois meses empilham — lado a lado são ~560px. */}
      <div className="relative flex flex-col gap-6 sm:flex-row">
        <button
          type="button"
          onClick={() => mover(-1)}
          aria-label="Meses anteriores"
          className="absolute left-0 top-0 inline-flex size-7 items-center justify-center rounded-full hover:bg-surface-2"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <Mes {...esquerda} selecao={selecao} hoje={hoje} aoEscolher={escolher} />
        <Mes {...direita} selecao={selecao} hoje={hoje} aoEscolher={escolher} />
        <button
          type="button"
          onClick={() => mover(1)}
          disabled={!podeAvancar}
          aria-label="Próximos meses"
          className="absolute right-0 top-0 inline-flex size-7 items-center justify-center rounded-full hover:bg-surface-2 disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <span className="text-[13px] font-semibold text-muted" aria-live="polite">
          {inicio ? formatarDataCurta(inicio) : "Início"} – {fim ? formatarDataCurta(fim) : "Fim"}
        </span>
        <button type="button" onClick={aoCancelar} className="pill ml-auto">
          Cancelar
        </button>
        <button
          type="button"
          disabled={inicio === null || fim === null}
          onClick={() => inicio && fim && aoAplicar(inicio, fim)}
          className="pill pill-ativo disabled:opacity-40"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
