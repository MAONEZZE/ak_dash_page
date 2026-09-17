import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";

interface Usuario {
  email: string;
}

interface AuthContextValor {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<{ erro: string | null }>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValor | null>(null);

function traduzirErro(mensagem: string): string {
  if (/invalid/i.test(mensagem)) return "Email ou senha inválidos.";
  return "Não foi possível entrar. Tente novamente.";
}

/**
 * Dono da sessão. O supabase-js é a única fonte da verdade — não há cópia do
 * access token em `localStorage` (havia, e era ela que envelhecia e derrubava a
 * TV; ver `obterToken` em `api.ts`), nem logout disparado por 401 do BFF.
 *
 * A sessão só acaba de duas formas: o clique em "Sair", ou o supabase-js
 * emitindo `SIGNED_OUT` porque o refresh token foi revogado/perdido. Um 401 do
 * BFF não é uma delas — a TV fica ligada dias sem ninguém por perto, e um 401
 * passageiro não pode custar a sessão.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user.email ? { email: data.session.user.email } : null);
      setCarregando(false);
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, session) => {
      setUsuario(session?.user.email ? { email: session.user.email } : null);
    });

    return () => assinatura.subscription.unsubscribe();
  }, []);

  async function entrar(email: string, senha: string): Promise<{ erro: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    return { erro: error ? traduzirErro(error.message) : null };
  }

  async function sair(): Promise<void> {
    await supabase.auth.signOut();
  }

  return <AuthContext.Provider value={{ usuario, carregando, entrar, sair }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValor {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return contexto;
}
