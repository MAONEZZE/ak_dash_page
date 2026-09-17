import { useSearchParams } from "react-router-dom";

export type Squad = "todos" | "sdr" | "closer";

export const SQUADS: { id: Squad; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "sdr", label: "SDR" },
  { id: "closer", label: "Closers" },
];

/**
 * Squad selecionado. Mora na querystring, como a granularidade, porque a pill
 * vive no header (fora da árvore da página) e quem lê é a Comercial — mesma
 * ponte que já existe pro período, sem context novo.
 */
export function useSquadAtual(): Squad {
  const [params] = useSearchParams();
  const valor = params.get("squad");
  return SQUADS.some((s) => s.id === valor) ? (valor as Squad) : "todos";
}

export function useDefinirSquad(): (squad: Squad) => void {
  const [params, setParams] = useSearchParams();

  return (squad: Squad) => {
    const novo = new URLSearchParams(params);
    novo.set("squad", squad);
    setParams(novo, { replace: true });
  };
}
