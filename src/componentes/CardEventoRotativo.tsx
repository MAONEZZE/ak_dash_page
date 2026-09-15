import { useEffect, useState } from "react";
import { CardKpi } from "./CardKpi";
import { formatarDataHoraEvento, formatarNumero } from "../lib/formato";
import type { EventoGeral } from "../lib/tipos-api";

/** Tempo de cada evento em tela. A barrinha do evento atual leva exatamente isso pra encher. */
const INTERVALO_MS = 5_000;

interface CardEventoRotativoProps {
  label: string;
  /** Até 3 próximos eventos, em data crescente. Vazio = card em estado vazio. */
  eventos: EventoGeral[];
  /** Qual contagem do evento o card mostra — o denominador é a capacidade nos dois casos. */
  campo: "inscritos" | "aprovados";
}

/**
 * Card escuro de Inscritos/Aprovados: gira entre os próximos eventos, um a
 * cada 5s, com uma barrinha por evento no rodapé (cheia = já passou, enchendo
 * = evento em tela, vazia = ainda vem). Substitui o CardKpi nesses dois cards
 * porque o número aqui é por evento, não do período da página.
 */
export function CardEventoRotativo({ label, eventos, campo }: CardEventoRotativoProps) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (eventos.length < 2) return; // um evento só não gira — sem timer à toa
    const id = setInterval(() => setIndice((atual) => atual + 1), INTERVALO_MS);
    return () => clearInterval(id);
  }, [eventos.length]);

  if (eventos.length === 0) {
    return (
      <CardKpi
        variante="escuro"
        tamanho="compacto"
        label={label}
        value="—"
        meta="—"
        pct={null}
        indisponivel
        legenda="Sem eventos futuros"
      />
    );
  }

  // Módulo no render (em vez de zerar o índice num efeito): se a lista de
  // eventos mudar de tamanho no meio da volta, o card nunca aponta pra fora dela.
  const atual = indice % eventos.length;
  const evento = eventos[atual];
  const valor = campo === "inscritos" ? evento.inscritos : evento.aprovados;

  return (
    <article className="flex h-[160px] flex-col gap-1 overflow-hidden rounded-2xl p-5 glass-panel-escuro">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[19px] font-semibold uppercase leading-none tracking-[0.13em] text-offwhite/74">{label}</span>
        <span className="whitespace-nowrap text-[15px] font-bold leading-none text-accent">{formatarDataHoraEvento(evento.data)}</span>
      </div>

      <span className="truncate text-[15px] font-semibold leading-tight text-offwhite/60" title={evento.titulo}>
        {evento.titulo}
      </span>

      <div className="mt-auto flex flex-wrap items-baseline gap-1.5">
        <span className="font-display text-[36px] font-extrabold leading-none tracking-tight text-offwhite">{formatarNumero(valor)}</span>
        <span className="whitespace-nowrap text-[22px] font-semibold leading-none text-offwhite/60">
          / {evento.capacidade === null ? "—" : formatarNumero(evento.capacidade)}
        </span>
      </div>

      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {eventos.map((e, i) => (
          <div key={e.id} className="h-[5px] flex-1 overflow-hidden rounded-full bg-offwhite/18">
            {i === atual ? (
              // `key` muda a cada volta: remonta a div e reinicia a animação do zero.
              <div key={`${indice}-${e.id}`} className="h-full rounded-full bg-accent barra-evento-preenchendo" />
            ) : (
              <div className={`h-full rounded-full bg-accent ${i < atual ? "w-full" : "w-0"}`} />
            )}
          </div>
        ))}
      </div>
    </article>
  );
}
