import { useState } from "react";
import { formatarNumero, nomeExibicao } from "../lib/formato";
import { Avatar } from "./Avatar";
import type { Granularidade, Metrica, PessoaComercial } from "../lib/tipos-api";

export interface PessoaUnificada {
  squad: "sdr" | "closer";
  pessoa: PessoaComercial;
}

interface Props {
  pessoas: PessoaUnificada[];
  granularidade: Granularidade;
  /** Chaves `"id_user:metrica"` de células que acabaram de subir — ver lib/som.tsx. */
  destaques?: Set<string>;
}

const RANGE_LABEL: Record<Granularidade, string> = { dia: "dia", semana: "semana", mes: "mês", ano: "ano" };

type EstadoVisual = "sem_meta" | "sem_preenchimento" | "ok";

function estadoVisual(m: Metrica): EstadoVisual {
  if (m.status === "sem_preenchimento") return "sem_preenchimento";
  if (m.status === "sem_meta") return "sem_meta";
  return "ok";
}

function pctMetrica(m: Metrica): number {
  return m.meta_periodo !== null && m.meta_periodo > 0 ? Math.min((m.realizado / m.meta_periodo) * 100, 100) : 0;
}

function metaTexto(m: Metrica): string {
  return m.meta_periodo === null ? "—" : formatarNumero(m.meta_periodo);
}

const ESTILO_HACHURA = { background: "repeating-linear-gradient(135deg, var(--color-hachura-a) 0 4px, var(--color-hachura-b) 4px 8px)" };

function CardPessoa({
  unidade,
  onClick,
  destaques,
}: {
  unidade: PessoaUnificada;
  onClick: () => void;
  destaques: Set<string>;
}) {
  const { pessoa, squad } = unidade;
  const nome = nomeExibicao(pessoa.nome, pessoa.email);
  const destaque = pessoa.metricas.slice(0, 4);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="glass-panel flex cursor-pointer flex-col gap-4 rounded-2xl p-4 outline-offset-[-2px] transition-colors hover:bg-glass-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-fg sm:grid sm:grid-cols-[minmax(180px,1fr)_minmax(0,3fr)] sm:items-center sm:gap-5"
    >
      <div className="flex items-center gap-3">
        <Avatar nome={nome} />
        <div className="flex flex-col gap-0.5">
          <span className="text-[21px] font-bold tracking-tight">{nome}</span>
          <span className="text-[17px] text-fg/55">
            {squad === "sdr" ? "SDR" : "Closer"} · {pessoa.metas_atingidas.atingidas}/{pessoa.metas_atingidas.total} metas batidas
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {destaque.map((m) => {
          const estado = estadoVisual(m);
          const subiu = destaques.has(`${pessoa.id_user}:${m.metrica}`);
          return (
            <div key={m.metrica} className={`flex flex-col gap-1 rounded-lg ${subiu ? "celula-subiu" : ""}`}>
              <span className="text-[15px] font-semibold uppercase tracking-[0.1em] text-fg/50">{m.nome_exibicao}</span>
              <span
                className={`font-display text-2xl font-extrabold tracking-tight ${m.status === "atingido" ? "text-accent-fg" : "text-fg"}`}
              >
                {formatarNumero(m.realizado)}/{metaTexto(m)}
              </span>
              {estado === "ok" ? (
                <div className="h-[3px] overflow-hidden rounded-full bg-progress-track">
                  <div
                    className={`h-full rounded-full ${m.status === "atingido" ? "bg-accent-fg" : "bg-status-bad"}`}
                    style={{ width: `${pctMetrica(m)}%` }}
                  />
                </div>
              ) : (
                <div className="h-[3px] rounded-full" style={ESTILO_HACHURA} aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModalPessoa({
  unidade,
  rangeLabel,
  onFechar,
}: {
  unidade: PessoaUnificada;
  rangeLabel: string;
  onFechar: () => void;
}) {
  const { pessoa, squad } = unidade;
  const nome = nomeExibicao(pessoa.nome, pessoa.email);

  return (
    <div
      onClick={onFechar}
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-8 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Métricas de ${nome}`}
        className="glass-panel flex max-h-[86vh] w-full max-w-[720px] flex-col gap-5 overflow-auto rounded-[20px] bg-bg-2/80 p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[15.5px] font-semibold uppercase tracking-[0.13em] text-fg/55">
              {squad === "sdr" ? "SDR" : "Closer"} · valores do {rangeLabel} / meta do {rangeLabel}
            </span>
            <span className="font-display text-[40px] font-extrabold tracking-tight">{nome}</span>
          </div>
          <button type="button" onClick={onFechar} className="rounded-full border border-border-2 bg-glass-bg px-4 py-2 text-[16px] font-semibold">
            Fechar
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {pessoa.metricas.map((m) => {
            const estado = estadoVisual(m);
            return (
              <div key={m.metrica} className="flex flex-col gap-1.5 rounded-xl border border-border-2 bg-bg-2/60 p-3.5">
                <span className="text-[15.5px] font-semibold uppercase tracking-[0.09em] text-fg/55">{m.nome_exibicao}</span>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`font-display text-[28px] font-extrabold tracking-tight ${m.status === "atingido" ? "text-accent-fg" : "text-fg"}`}
                  >
                    {formatarNumero(m.realizado)} / {metaTexto(m)}
                  </span>
                  {estado === "ok" && <span className="text-[17px] font-semibold text-fg/60">{Math.round(pctMetrica(m))}%</span>}
                  {estado === "sem_meta" && <span className="text-[17px] font-semibold text-fg/50">sem meta</span>}
                </div>
                {estado === "ok" ? (
                  <div className="h-1 overflow-hidden rounded-full bg-progress-track">
                    <div
                      className={`h-full rounded-full ${m.status === "atingido" ? "bg-accent-fg" : "bg-status-bad"}`}
                      style={{ width: `${pctMetrica(m)}%` }}
                    />
                  </div>
                ) : (
                  <div className="h-1 rounded-full" style={ESTILO_HACHURA} aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Substitui VisaoGeralComercial + TabelaMetas + Insights + GraficoStatusPizza + GraficoRealizadoMeta — lista de cards com modal de detalhe. */
export function TimeComercialLista({ pessoas, granularidade, destaques }: Props) {
  const [idAberto, setIdAberto] = useState<string | null>(null);
  const aberta = pessoas.find((u) => u.pessoa.id_user === idAberto) ?? null;
  const destaquesEfetivos = destaques ?? new Set<string>();

  if (pessoas.length === 0) {
    return <p className="text-xl text-fg/60">Nenhuma pessoa com dado lançado neste período.</p>;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3.5">
        <span className="font-display text-4xl font-semibold tracking-tight">Time comercial</span>
        <span className="text-[17px] text-fg/50">Clique em uma pessoa pra ver todas as métricas</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {pessoas.map((u) => (
          <CardPessoa key={u.pessoa.id_user} unidade={u} onClick={() => setIdAberto(u.pessoa.id_user)} destaques={destaquesEfetivos} />
        ))}
      </div>
      {aberta && <ModalPessoa unidade={aberta} rangeLabel={RANGE_LABEL[granularidade]} onFechar={() => setIdAberto(null)} />}
    </section>
  );
}
