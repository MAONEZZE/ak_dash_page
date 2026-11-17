import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { buscarEventosFunilSdr } from "../lib/api";
import { formatarDiaMesEvento } from "../lib/formato";
import type { OpcaoEvento } from "../lib/tipos-api";

/** Evento escolhido no filtro, lido da querystring (`evento=<id>`). Sem filtro, null (= próximo evento). */
export function useEventoSelecionado(): string | null {
  const [params] = useSearchParams();
  return params.get("evento");
}

const ROTULO_PADRAO = "Próximo evento";

/**
 * Filtro de evento do header: escolhe qual evento (qualquer título, a partir de agora) alimenta o velocímetro e
 * os cards do evento do Funil SDR. Mora na querystring (`evento=`) e só fica
 * habilitado nessa página; a lista de eventos só é buscada quando habilitado.
 */
export function PillEvento({ disabled = false }: { disabled?: boolean }) {
  const [params, setParams] = useSearchParams();
  const selecionado = params.get("evento");
  const [eventos, setEventos] = useState<OpcaoEvento[]>([]);
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;
    let ativo = true;
    buscarEventosFunilSdr()
      .then((r) => ativo && setEventos(r.eventos))
      .catch(() => ativo && setEventos([]));
    return () => {
      ativo = false;
    };
  }, [disabled]);

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

  function escolher(id: string | null) {
    const novo = new URLSearchParams(params);
    if (id === null) novo.delete("evento");
    else novo.set("evento", id);
    setParams(novo, { replace: true });
    setAberto(false);
  }

  const atual = eventos.find((e) => e.id === selecionado);
  const rotulo = disabled || !selecionado ? ROTULO_PADRAO : atual ? atual.titulo : "Evento";
  const opcoes: { id: string | null; titulo: string; data?: string }[] = [{ id: null, titulo: ROTULO_PADRAO }, ...eventos];

  return (
    <div className="relative" ref={container} role="group" aria-label="Evento">
      <div className="glass-pill flex p-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAberto((a) => !a)}
          aria-haspopup="listbox"
          aria-expanded={aberto}
          aria-disabled={disabled}
          aria-label={`Evento: ${rotulo}`}
          className="pill pill-ativo inline-flex max-w-[16rem] items-center gap-1.5 disabled:pointer-events-none disabled:opacity-45"
        >
          <span className="truncate">{rotulo}</span>
          <ChevronDown className={`size-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>
      {!disabled && aberto && (
        <ul
          role="listbox"
          aria-label="Evento"
          className="absolute right-0 top-[calc(100%+10px)] z-50 max-h-80 w-72 overflow-y-auto rounded-2xl glass-flutuante py-1"
        >
          {opcoes.map((o) => {
            const marcado = o.id === selecionado;
            return (
              <li key={o.id ?? "proxima"} role="option" aria-selected={marcado}>
                <button
                  type="button"
                  onClick={() => escolher(o.id)}
                  className="flex min-h-11 w-full items-center gap-2.5 px-4 py-2.5 text-left text-[15px] font-semibold transition-colors hover:bg-surface-2"
                >
                  <Check className={`size-4 shrink-0 ${marcado ? "" : "invisible"}`} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{o.titulo}</span>
                  {o.data && <span className="shrink-0 text-[13px] font-medium text-muted">{formatarDiaMesEvento(o.data)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
