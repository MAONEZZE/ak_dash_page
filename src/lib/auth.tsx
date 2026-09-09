import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { aoNaoAutorizado } from "./api";
import { supabase } from "./supabase";

const CHAVE_TOKEN = "ak_dash_token";

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

function sincronizarToken(session: Session | null): void {
  if (session?.access_token) {
    localStorage.setItem(CHAVE_TOKEN, session.access_token);
  } else {
    localStorage.removeItem(CHAVE_TOKEN);
  }
}

function traduzirErro(mensagem: string): string {
  if (/invalid/i.test(mensagem)) return "Email ou senha inválidos.";
  return "Não foi possível entrar. Tente novamente.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const temSessaoRef = useRef(false);
  const saindoPor401Ref = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      sincronizarToken(data.session);
      temSessaoRef.current = data.session !== null;
      setUsuario(data.session?.user.email ? { email: data.session.user.email } : null);
      setCarregando(false);
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, session) => {
      sincronizarToken(session);
      temSessaoRef.current = session !== null;
      if (session !== null) saindoPor401Ref.current = false;
      setUsuario(session?.user.email ? { email: session.user.email } : null);
    });

    // Sessão expirada/token inválido detectado pelo BFF (401) força o mesmo caminho de saída.
    // Guardado contra chamadas repetidas: sem isso, cada requisição que falhar com 401
    // (ex: BFF fora do ar ou mal configurado) dispara um signOut() novo, e o signOut()
    // num cliente que já não tem sessão responde 403 — loop de erro sem fim.
    aoNaoAutorizado(() => {
      if (!temSessaoRef.current || saindoPor401Ref.current) return;
      saindoPor401Ref.current = true;
      supabase.auth.signOut().catch(() => {});
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
