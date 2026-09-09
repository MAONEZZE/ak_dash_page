import { Globe } from "lucide-react";

/** Selo obrigatório em qualquer card que ignora o filtro de pessoa (financeiro, imersão). */
export function MarcadorGlobal() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border-2 px-2 py-0.5 text-xs text-fg/70">
      <Globe className="size-3" aria-hidden />
      não afetado pelo filtro de pessoa
    </span>
  );
}
