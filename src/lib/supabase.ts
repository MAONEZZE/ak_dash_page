import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Projeto Supabase real ainda não existe — sem essas env vars o login sempre falha,
  // mas o app não deve quebrar no boot (mesmo padrão de degradação graciosa do BFF).
  console.warn(
    "VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY não configurados — login não vai funcionar até o projeto Supabase existir.",
  );
}

/**
 * `persistSession` e `autoRefreshToken` são o padrão do supabase-js, mas estão
 * explícitos porque o dashboard roda numa TV, ligado sem ninguém por perto:
 * desligar qualquer um dos dois faz a tela cair no login sozinha em algumas
 * horas. O refresh token não expira por tempo — enquanto ele for renovado, a
 * sessão da TV dura indefinidamente.
 *
 * `detectSessionInUrl` fica desligado: só serve pro retorno de OAuth/magic
 * link, que este app não usa (login é email+senha), e ligado ele mexe na URL
 * no boot — o que aqui só atrapalha, já que os filtros de período vivem na
 * querystring.
 */
export const supabase = createClient(url ?? "https://placeholder.supabase.co", anonKey ?? "placeholder-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
