import { useSearchParams } from "react-router-dom";
import type { Cargo } from "./tipos-api";

export const SQUADS: { id: Cargo; label: string }[] = [
  { id: "seller", label: "Sellers" },
  { id: "sdr", label: "SDRs" },
  { id: "closer", label: "Closers" },
];

/**
 * Cargos marcados no filtro de função, na ordem do funil. Mora na querystring
 * (`squad=seller,sdr`), como a granularidade, porque o filtro vive no header
 * (fora da árvore da página). Sem filtro (ou `squad=todos`) são os três.
 */
export function useCargosFiltrados(): Cargo[] {
  const [params] = useSearchParams();
  const valores = (params.get("squad") ?? "").split(",");
  const marcados = SQUADS.filter((s) => valores.includes(s.id)).map((s) => s.id);
  return marcados.length > 0 ? marcados : SQUADS.map((s) => s.id);
}

/** Grava a seleção; com os três marcados o filtro sai da querystring. */
export function useDefinirCargos(): (cargos: Cargo[]) => void {
  const [params, setParams] = useSearchParams();

  return (cargos: Cargo[]) => {
    const novo = new URLSearchParams(params);
    const ordenados = SQUADS.filter((s) => cargos.includes(s.id)).map((s) => s.id);
    if (ordenados.length === 0 || ordenados.length === SQUADS.length) novo.delete("squad");
    else novo.set("squad", ordenados.join(","));
    setParams(novo, { replace: true });
  };
}
