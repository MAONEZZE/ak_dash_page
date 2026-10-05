import { TriangleAlert } from "lucide-react";

const PREFIXO = "fonte_indisponivel:";

/**
 * Aviso de fonte de dado que caiu. O BFF degrada consulta com falha pra vazio
 * (o resto da página continua de pé), e sem este aviso isso aparecia como 0 —
 * indistinguível de "ninguém lançou nada".
 */
export function AvisoFontes({ avisos }: { avisos: string[] | undefined }) {
  const fontes = (avisos ?? []).filter((a) => a.startsWith(PREFIXO)).map((a) => a.slice(PREFIXO.length));
  if (fontes.length === 0) return null;

  return (
    <p role="alert" className="flex items-center gap-2 rounded-xl bg-warn-bg px-4 py-2 text-[14px] font-semibold text-warn">
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      Fonte de dados indisponível: {fontes.join(", ")}. Os números que dependem dela podem aparecer zerados.
    </p>
  );
}
