import { createContext, useContext, useState, type ReactNode } from "react";
import type { DiasUteis } from "./tipos-api";

interface AtualizacaoValor {
  atualizadoEm: Date | null;
  atualizando: boolean;
  aoAtualizar: (() => void) | null;
  /** Comercial e Time publicam o `dias_uteis` do período pro "Dia útil X de Y" do cabeçalho. */
  diasUteis?: DiasUteis;
}

const VALOR_INICIAL: AtualizacaoValor = { atualizadoEm: null, atualizando: false, aoAtualizar: null };

interface AtualizacaoContextValor {
  valor: AtualizacaoValor;
  registrar: (valor: AtualizacaoValor) => void;
}

const AtualizacaoContext = createContext<AtualizacaoContextValor | null>(null);

/**
 * Ponte entre a página (dona do fetch/refresh) e o header (fora da árvore da página) —
 * a página que tiver botão de atualizar chama `registrar`; o header só lê `valor`
 * (refresh e, na Comercial/Time, os dias úteis do período).
 */
export function AtualizacaoProvider({ children }: { children: ReactNode }) {
  const [valor, registrar] = useState<AtualizacaoValor>(VALOR_INICIAL);
  return <AtualizacaoContext.Provider value={{ valor, registrar }}>{children}</AtualizacaoContext.Provider>;
}

export function useAtualizacao(): AtualizacaoContextValor {
  const contexto = useContext(AtualizacaoContext);
  if (!contexto) throw new Error("useAtualizacao precisa estar dentro de <AtualizacaoProvider>");
  return contexto;
}
