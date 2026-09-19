import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Granularidade } from "./tipos-api";

/** De quanto em quanto tempo se reconfere em que dia estamos — mesma cadência do auto-refresh das páginas. */
const INTERVALO_CHECAGEM_DIA_MS = 60_000;

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

export function paraPeriodo(granularidade: Granularidade, data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  if (granularidade === "dia") return `${ano}-${mes}-${dia}`;
  if (granularidade === "semana") return semanaIso(data);
  if (granularidade === "mes") return `${ano}-${mes}`;
  return `${ano}`;
}

/**
 * Período corrente da granularidade, RECALCULADO enquanto a página está aberta.
 *
 * `new Date()` só é lido quando o React renderiza, e o dashboard vive numa TV
 * com a aba aberta por dias seguidos. Sem este tick, a virada da meia-noite
 * não dispara render nenhum: a página continuava pedindo ao BFF o mesmo dia em
 * que foi aberta, e o auto-refresh de 60s rebuscava fielmente o dia velho pra
 * sempre — era esse o dash "parado no 17/09".
 *
 * `setPeriodo` com a mesma string é no-op no React, então nos outros 1439
 * minutos do dia isto não re-renderiza nada.
 */
function usePeriodoCorrente(granularidade: Granularidade): string {
  const [periodo, setPeriodo] = useState(() => paraPeriodo(granularidade, hoje()));

  useEffect(() => {
    const conferir = () => setPeriodo(paraPeriodo(granularidade, hoje()));
    conferir();
    const id = setInterval(conferir, INTERVALO_CHECAGEM_DIA_MS);
    return () => clearInterval(id);
  }, [granularidade]);

  return periodo;
}

/**
 * Lê o filtro atual (granularidade + período) — consumido pelas páginas que buscam dados.
 *
 * O período NÃO vem da querystring: é sempre o corrente. A querystring já
 * guardou um período absoluto (`?periodo=2026-09-17`), e isso congelava a
 * página naquela data pra sempre — inclusive na TV, que reabre sempre a mesma
 * URL salva. Não existe (nem existia) tela pra escolher período passado: a
 * pill de período escolhe a GRANULARIDADE, e "qual dia/semana/mês" é sempre
 * agora. Um `periodo` que tenha sobrado numa URL antiga é ignorado.
 */
export function useFiltrosAtuais(): { granularidade: Granularidade; periodo: string } {
  const [params] = useSearchParams();
  const granularidade = (params.get("granularidade") as Granularidade | null) ?? "mes";
  const periodo = usePeriodoCorrente(granularidade);
  return { granularidade, periodo };
}

/** Escreve a granularidade na querystring — usado pela pill global do header. */
export function useDefinirGranularidade(): (granularidade: Granularidade) => void {
  const [params, setParams] = useSearchParams();

  return (granularidade: Granularidade) => {
    const novo = new URLSearchParams(params);
    novo.set("granularidade", granularidade);
    // O período sai da URL de propósito — ver `useFiltrosAtuais`. Gravá-lo era
    // o que prendia a página no dia do clique. Também limpa a sujeira que
    // versões anteriores deixaram em URLs salvas.
    novo.delete("periodo");
    setParams(novo, { replace: true });
  };
}
