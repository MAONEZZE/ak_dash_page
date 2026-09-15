import { useSearchParams } from "react-router-dom";
import type { Granularidade } from "./tipos-api";

function hoje(): Date {
  return new Date();
}

/** "AAAA-Wnn" da semana ISO que contém `data` — mesmo rótulo que o BFF resolve em `periodo.py::semana_iso`. */
export function semanaIso(data: Date): string {
  // Quinta-feira da mesma semana define o ano ISO (regra da ISO-8601): 31/12
  // pode pertencer à semana 1 do ano seguinte.
  const quinta = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  quinta.setUTCDate(quinta.getUTCDate() + 4 - (quinta.getUTCDay() || 7));
  const primeiroDia = new Date(Date.UTC(quinta.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((quinta.getTime() - primeiroDia.getTime()) / 86_400_000 + 1) / 7);
  return `${quinta.getUTCFullYear()}-W${String(semana).padStart(2, "0")}`;
}

function paraPeriodo(granularidade: Granularidade, data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  if (granularidade === "dia") return `${ano}-${mes}-${dia}`;
  if (granularidade === "semana") return semanaIso(data);
  if (granularidade === "mes") return `${ano}-${mes}`;
  return `${ano}`;
}

/** Lê o período atual (granularidade/período) da querystring — consumido pelas páginas que buscam dados comerciais. */
export function useFiltrosAtuais(): { granularidade: Granularidade; periodo: string } {
  const [params] = useSearchParams();
  const granularidade = (params.get("granularidade") as Granularidade | null) ?? "mes";
  const periodo = params.get("periodo") ?? paraPeriodo("mes", hoje());
  return { granularidade, periodo };
}

/** Escreve a granularidade (e o período correspondente a "agora") na querystring — usado pela pill global do header. */
export function useDefinirGranularidade(): (granularidade: Granularidade) => void {
  const [params, setParams] = useSearchParams();

  return (granularidade: Granularidade) => {
    const novo = new URLSearchParams(params);
    novo.set("granularidade", granularidade);
    novo.set("periodo", paraPeriodo(granularidade, hoje()));
    setParams(novo, { replace: true });
  };
}
