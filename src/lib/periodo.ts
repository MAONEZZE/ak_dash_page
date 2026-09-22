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

/** Primeiro mês com venda em `dash.metricas_faturamento` — piso da navegação
 * da pill de mês (Financeiro). A pill vive em `App.tsx`, fora da árvore das
 * páginas, e não tem como descobrir isso sozinha. */
export const MES_MINIMO = "2026-01";

function mesDe(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function somarMeses(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const data = new Date(Date.UTC(ano, m - 1 + delta, 1));
  return `${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, "0")}`;
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

function dataDoDia(dia: string): Date {
  const [ano, mes, d] = dia.split("-").map(Number);
  return new Date(ano, mes - 1, d);
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
 * O estado guarda o DIA, e o período sai dele durante o render. Antes o estado
 * guardava o próprio período e quem o recalculava era um efeito: na troca de
 * granularidade o render acontecia com o par errado (granularidade nova +
 * período da granularidade velha, ex. `mes` com `2026-09-22`), a página
 * disparava a busca com esse par e o BFF respondia 400 "periodo inválido para
 * granularidade 'mes': esperado AAAA-MM" — o erro que piscava na tela a cada
 * clique na pill de período. Derivando no render, esse par nunca existe.
 *
 * `setDia` com a mesma string é no-op no React, então nos outros 1439 minutos
 * do dia isto não re-renderiza nada.
 */
function usePeriodoCorrente(granularidade: Granularidade): string {
  const [dia, setDia] = useState(() => paraPeriodo("dia", hoje()));

  useEffect(() => {
    const id = setInterval(() => setDia(paraPeriodo("dia", hoje())), INTERVALO_CHECAGEM_DIA_MS);
    return () => clearInterval(id);
  }, []);

  return paraPeriodo(granularidade, dataDoDia(dia));
}

/**
 * Lê o filtro atual (granularidade + período) — consumido pelas páginas que buscam dados.
 *
 * Em dia/semana/ano o período NÃO vem da querystring: é sempre o corrente. A
 * querystring já guardou um período absoluto (`?periodo=2026-09-17`), e isso
 * congelava a página naquela data pra sempre — inclusive na TV, que reabre
 * sempre a mesma URL salva. Não existe tela pra escolher dia/semana/ano
 * passado: a pill de período escolhe a GRANULARIDADE, e "qual dia/semana/ano"
 * é sempre agora.
 *
 * Em MÊS a regra se inverte: a Financeiro ganhou navegação de mês passado
 * (pill `‹ Setembro 2026 ›`, ver `useNavegarMes`), então um `periodo` na URL
 * agora É respeitado — com fallback pro mês corrente quando ausente.
 */
export function useFiltrosAtuais(): { granularidade: Granularidade; periodo: string } {
  const [params] = useSearchParams();
  const granularidade = (params.get("granularidade") as Granularidade | null) ?? "mes";
  const periodoCorrente = usePeriodoCorrente(granularidade);
  const periodoUrl = params.get("periodo");
  const periodo = granularidade === "mes" && periodoUrl ? periodoUrl : periodoCorrente;
  return { granularidade, periodo };
}

/**
 * Navegação de mês passado da Financeiro: pill `‹ Setembro 2026 ›`. Só faz
 * sentido sob granularidade Mês (quem chama já garante isso). Limites:
 * `MES_MINIMO` pra trás, o mês corrente pra frente — nunca pede dado futuro.
 */
export function useNavegarMes(): {
  mes: string;
  podeVoltar: boolean;
  podeAvancar: boolean;
  voltar: () => void;
  avancar: () => void;
} {
  const [params, setParams] = useSearchParams();
  const { periodo } = useFiltrosAtuais();
  const mesCorrente = mesDe(hoje());

  function ir(mes: string) {
    const novo = new URLSearchParams(params);
    novo.set("granularidade", "mes");
    novo.set("periodo", mes);
    setParams(novo, { replace: true });
  }

  return {
    mes: periodo,
    podeVoltar: periodo > MES_MINIMO,
    podeAvancar: periodo < mesCorrente,
    voltar: () => ir(somarMeses(periodo, -1)),
    avancar: () => ir(somarMeses(periodo, 1)),
  };
}

/**
 * Intervalo [inicio, fim] (AAAA-MM-DD) de uma granularidade+período — mesma
 * regra de `resolver_periodo` no backend (`app/periodo.py`), pra recortar em
 * memória o ano inteiro que a Financeiro busca (ver `agregacoes-financeiro.ts`).
 */
export function limitesPeriodo(granularidade: Granularidade, periodo: string): { inicio: string; fim: string } {
  if (granularidade === "dia") return { inicio: periodo, fim: periodo };

  if (granularidade === "mes") {
    const [anoStr, mesStr] = periodo.split("-");
    const ano = Number(anoStr);
    const mes = Number(mesStr);
    const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    return { inicio: `${periodo}-01`, fim: `${periodo}-${String(ultimoDia).padStart(2, "0")}` };
  }

  if (granularidade === "semana") {
    const [anoStr, semanaStr] = periodo.toUpperCase().split("-W");
    const inicio = inicioDaSemanaIso(Number(anoStr), Number(semanaStr));
    const fim = new Date(inicio);
    fim.setUTCDate(inicio.getUTCDate() + 6);
    return { inicio: isoUTC(inicio), fim: isoUTC(fim) };
  }

  return { inicio: `${periodo}-01-01`, fim: `${periodo}-12-31` };
}

function isoUTC(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Segunda-feira da semana ISO `ano`-W`semana` — mesma regra de `date.fromisocalendar` do Python. */
function inicioDaSemanaIso(ano: number, semana: number): Date {
  const dia4DeJaneiro = new Date(Date.UTC(ano, 0, 4));
  const diaDaSemana = dia4DeJaneiro.getUTCDay() || 7; // 1 (segunda) .. 7 (domingo)
  const segundaSemana1 = new Date(dia4DeJaneiro);
  segundaSemana1.setUTCDate(dia4DeJaneiro.getUTCDate() - diaDaSemana + 1);
  const inicio = new Date(segundaSemana1);
  inicio.setUTCDate(segundaSemana1.getUTCDate() + (semana - 1) * 7);
  return inicio;
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
