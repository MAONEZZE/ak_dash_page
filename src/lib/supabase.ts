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

export const supabase = createClient(url ?? "https://placeholder.supabase.co", anonKey ?? "placeholder-anon-key");
