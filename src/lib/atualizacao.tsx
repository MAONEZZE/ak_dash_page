import { createContext, useContext, useState, type ReactNode } from "react";

interface AtualizacaoValor {
  atualizadoEm: Date | null;
  atualizando: boolean;
  aoAtualizar: (() => void) | null;
}

const VALOR_INICIAL: AtualizacaoValor = { atualizadoEm: null, atualizando: false, aoAtualizar: null };

interface AtualizacaoContextValor {
  valor: AtualizacaoValor;
  registrar: (valor: AtualizacaoValor) => void;
}

const AtualizacaoContext = createContext<AtualizacaoContextValor | null>(null);

/**
 * Ponte entre a página (dona do fetch/refresh) e o header (fora da árvore da página) —
 * a página que tiver botão de atualizar chama `registrar`; o header só lê `valor`.
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
