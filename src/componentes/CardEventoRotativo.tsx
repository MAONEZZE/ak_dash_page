import { useEffect, useState } from "react";
import { CardKpi } from "./CardKpi";
import {
  CARD_COMPACTO_BARRA,
  CARD_COMPACTO_CAIXA,
  CARD_COMPACTO_LABEL,
  CARD_COMPACTO_META,
  CARD_COMPACTO_MIUDO,
  CARD_COMPACTO_RODAPE,
  CARD_COMPACTO_VAO,
  escalaValorCompacto,
} from "../lib/card-compacto";
import { formatarDataHoraEvento, formatarNumero } from "../lib/formato";
import type { EventoGeral } from "../lib/tipos-api";

/** Tempo de cada evento em tela. A barrinha do evento atual leva exatamente isso pra encher. */
const INTERVALO_MS = 5_000;

interface CardEventoRotativoProps {
  label: string;
  /** Até 3 próximos eventos, em data crescente. Vazio = card em estado vazio. */
  eventos: EventoGeral[];
  /** Qual contagem do evento o card mostra — só "inscritos" ganha o denominador de capacidade. */
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
        meta={campo === "inscritos" ? "—" : undefined}
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
  const valorTexto = formatarNumero(valor);

  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl glass-panel-escuro ${CARD_COMPACTO_CAIXA}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`font-semibold uppercase tracking-[0.13em] text-offwhite/74 ${CARD_COMPACTO_LABEL}`}>{label}</span>
        <span className={`whitespace-nowrap font-bold leading-none text-accent ${CARD_COMPACTO_MIUDO}`}>{formatarDataHoraEvento(evento.data)}</span>
      </div>

      <span className={`mt-[clamp(2px,0.5vh,6px)] truncate font-semibold leading-tight text-offwhite/60 ${CARD_COMPACTO_MIUDO}`} title={evento.titulo}>
        {evento.titulo}
      </span>

      <div className={`flex flex-wrap items-baseline gap-1.5 ${CARD_COMPACTO_VAO}`}>
        <span className={`font-display font-extrabold leading-none tracking-tight text-offwhite ${escalaValorCompacto(valorTexto)}`}>{valorTexto}</span>
        {/* Aprovados é número absoluto: a capacidade só faz sentido como denominador dos inscritos. */}
        {campo === "inscritos" && (
          <span className={`whitespace-nowrap font-semibold leading-none text-offwhite/60 ${CARD_COMPACTO_META}`}>
            / {evento.capacidade === null ? "—" : formatarNumero(evento.capacidade)}
          </span>
        )}
      </div>

      <div className={`flex gap-1.5 ${CARD_COMPACTO_RODAPE}`} aria-hidden="true">
        {eventos.map((e, i) => (
          <div key={e.id} className={`flex-1 overflow-hidden rounded-full bg-offwhite/18 ${CARD_COMPACTO_BARRA}`}>
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
