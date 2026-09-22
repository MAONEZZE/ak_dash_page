import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { estaLiberado, liberar as liberarAudio, plin, type PerfilSom } from "./som-audio";
import { paraPeriodo } from "./periodo";
import type { Granularidade } from "./tipos-api";

const CHAVE_SOM = "ak_dash_som";

/** Só Nathan e Jennifer, os dois SDRs — lista fixa, e-mail só pra identificar quem é quem aqui. */
const VIGIADOS = new Map<string, PerfilSom>([
  ["9", "nathan"], // nathanmayumi5@gmail.com
  ["4", "jennifer"], // jenniferpamplona007@gmail.com
]);

const METRICAS_COM_SOM = new Set(["ligacoes_agendadas", "reunioes_agendadas"]);

const ATRASO_ENTRE_PESSOAS_MS = 450;
const DURACAO_DESTAQUE_MS = 2000;

interface SomContextValor {
  ligado: boolean;
  liberado: boolean;
  alternar: () => void;
}

const SomContext = createContext<SomContextValor | null>(null);

/**
 * Mesmo formato de `AtualizacaoProvider`: estado simples exposto via context.
 * `ligado` é a preferência do usuário (persistida); `liberado` é se o
 * navegador já autorizou áudio (exige gesto do usuário — daí `alternar`
 * chamar `liberarAudio` antes de qualquer outra coisa).
 */
export function SomProvider({ children }: { children: ReactNode }) {
  const [ligado, setLigado] = useState(() => localStorage.getItem(CHAVE_SOM) !== "false");
  const [liberado, setLiberado] = useState(() => estaLiberado());

  useEffect(() => {
    localStorage.setItem(CHAVE_SOM, String(ligado));
  }, [ligado]);

  async function alternar() {
    // Enquanto o áudio não foi liberado, o clique serve só pra isso — é o
    // gesto que o navegador exige. O plin da Jennifer é a confirmação de que
    // deu certo (e prova que a TV está com volume aberto).
    if (ligado && !liberado) {
      const ok = await liberarAudio();
      if (ok) {
        setLiberado(true);
        plin("jennifer");
      }
      return;
    }
    setLigado((l) => !l);
  }

  return <SomContext.Provider value={{ ligado, liberado, alternar }}>{children}</SomContext.Provider>;
}

export function useSom(): SomContextValor {
  const contexto = useContext(SomContext);
  if (!contexto) throw new Error("useSom precisa estar dentro de <SomProvider>");
  return contexto;
}

/** Formato mínimo comum a `PessoaGeral` e `PessoaComercial` — só o que a regra de disparo precisa. */
export interface PessoaParaSom {
  id_user: string | number;
  metricas: { metrica: string; realizado: number | null }[];
}

interface ParametrosSomDeAumento {
  pessoas: PessoaParaSom[] | undefined;
  granularidade: Granularidade;
  periodo: string;
}

type MetricasPorPessoa = Map<string, Record<string, number>>;

function extrairBaseline(pessoas: PessoaParaSom[]): MetricasPorPessoa {
  const mapa: MetricasPorPessoa = new Map();
  for (const p of pessoas) {
    const id = String(p.id_user);
    if (!VIGIADOS.has(id)) continue;
    const entrada: Record<string, number> = {};
    for (const m of p.metricas) {
      if (!METRICAS_COM_SOM.has(m.metrica) || m.realizado === null) continue;
      entrada[m.metrica] = m.realizado;
    }
    mapa.set(id, entrada);
  }
  return mapa;
}

/**
 * Regra de disparo do plin: compara o `realizado` de ligações/reuniões
 * agendadas do Nathan e da Jennifer entre dois refreshes e toca um som por
 * pessoa que subiu. Ver docs/plans/som-agendamento-nathan-jennifer.md.
 *
 * O efeito roda pela identidade de `pessoas` — cada fetch bem sucedido cria
 * um array novo, e um refresh que falhou mantém o antigo, então falha de
 * rede não dispara nada.
 */
export function useSomDeAumento({ pessoas, granularidade, periodo }: ParametrosSomDeAumento): { destaques: Set<string> } {
  const { ligado } = useSom();
  const baselineRef = useRef<MetricasPorPessoa | null>(null);
  const chaveRef = useRef<string | null>(null);
  const [destaques, setDestaques] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!pessoas) return;

    const chave = `${granularidade}:${periodo}`;
    const chaveMudou = chaveRef.current !== chave;
    const anterior = chaveMudou ? null : baselineRef.current;
    const atual = extrairBaseline(pessoas);

    chaveRef.current = chave;
    baselineRef.current = atual;

    // 1ª carga, troca de página/filtro (chave mudou) ou período que não é o
    // corrente: só grava a baseline, sem tocar nada.
    const ehPeriodoCorrente = periodo === paraPeriodo(granularidade, new Date());
    if (chaveMudou || !anterior || !ehPeriodoCorrente) return;

    const novosDestaques = new Set<string>();
    const idsQueSubiram: string[] = [];
    for (const id of VIGIADOS.keys()) {
      const antes = anterior.get(id);
      const agora = atual.get(id);
      if (!antes || !agora) continue;

      let subiu = false;
      for (const metrica of METRICAS_COM_SOM) {
        if (agora[metrica] === undefined || antes[metrica] === undefined) continue;
        if (agora[metrica] <= antes[metrica]) continue;
        subiu = true;
        novosDestaques.add(`${id}:${metrica}`);
      }
      if (subiu) idsQueSubiram.push(id);
    }

    if (novosDestaques.size === 0) return;

    setDestaques((prev) => new Set([...prev, ...novosDestaques]));

    const timers: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => {
        setDestaques((prev) => {
          const proximo = new Set(prev);
          novosDestaques.forEach((c) => proximo.delete(c));
          return proximo;
        });
      }, DURACAO_DESTAQUE_MS),
    ];

    // Um som por pessoa, em sequência — nunca um por métrica.
    if (ligado) {
      idsQueSubiram.forEach((id, indice) => {
        const perfil = VIGIADOS.get(id)!;
        timers.push(setTimeout(() => plin(perfil), indice * ATRASO_ENTRE_PESSOAS_MS));
      });
    }

    return () => timers.forEach(clearTimeout);
  }, [pessoas, granularidade, periodo, ligado]);

  return { destaques };
}
