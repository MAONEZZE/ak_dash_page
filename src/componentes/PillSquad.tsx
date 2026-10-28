import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SQUADS, useCargosFiltrados, useDefinirCargos } from "../lib/squad";

/**
 * Filtro de função da Comercial e da Time — fica no header, à direita do filtro
 * de data. Combobox com uma checkbox por cargo; o último marcado não desmarca.
 */
export function PillSquad() {
  const cargos = useCargosFiltrados();
  const definirCargos = useDefinirCargos();
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const todos = cargos.length === SQUADS.length;
  const rotulo = todos ? "Todos" : SQUADS.filter((s) => cargos.includes(s.id)).map((s) => s.label).join(", ");

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
    <div className="relative" ref={container} role="group" aria-label="Função">
      <div className="glass-pill flex p-1">
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-haspopup="true"
          aria-expanded={aberto}
          aria-label={`Função: ${rotulo}`}
          className="pill pill-ativo inline-flex items-center gap-1.5"
        >
          {rotulo}
          <ChevronDown className={`size-4 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </div>
      {aberto && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-48 overflow-hidden rounded-2xl glass-flutuante py-1">
          {SQUADS.map((s) => {
            const marcado = cargos.includes(s.id);
            const ultimo = marcado && cargos.length === 1;
            return (
              <label
                key={s.id}
                className={`flex min-h-11 cursor-pointer items-center gap-2.5 px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-surface-2 ${ultimo ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  disabled={ultimo}
                  onChange={() => definirCargos(marcado ? cargos.filter((c) => c !== s.id) : [...cargos, s.id])}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={`inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border peer-focus-visible:ring-2 peer-focus-visible:ring-brand ${marcado ? "border-brand bg-brand text-white" : "border-line"}`}
                >
                  {marcado && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                {s.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
