import { SQUADS, useDefinirSquad, useSquadAtual } from "../lib/squad";

/** Filtro de função (Todos/SDR/Closers) da Comercial e da Time — fica na linha do título da página, à direita. */
export function PillSquad() {
  const squad = useSquadAtual();
  const definirSquad = useDefinirSquad();

  return (
    <div className="glass-pill flex gap-1 p-1" role="group" aria-label="Função">
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
