import { supabase } from "./supabase";

/**
 * Foto (bucket público `fotos_dash`) de cada conta dos funis, pelo nome que vem
 * do BFF em minúsculas. A mesma pessoa pode ter apelido diferente por canal
 * (Mariana no LinkedIn, Mary no Instagram).
 */
const ARQUIVOS: Record<string, string> = {
  jacob: "jacob.png",
  jonathan: "jonathan.png",
  alex: "alex.png",
  mariana: "mariana.jpeg",
  mary: "mariana.jpeg",
  leticia: "leticia.jpeg",
  jennifer: "jennifer.png",
  akeel: "akeel.jpeg",
};

/** URL pública da foto da conta; `null` quando a conta não tem foto mapeada (o Avatar cai na inicial). */
export function fotoConta(nome: string): string | null {
  const arquivo = ARQUIVOS[nome.trim().toLowerCase()];
  return arquivo ? supabase.storage.from("fotos_dash").getPublicUrl(arquivo).data.publicUrl : null;
}
