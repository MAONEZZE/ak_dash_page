import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

interface CardProps {
  titulo: string;
  carregando?: boolean;
  erro?: string | null;
  vazio?: boolean;
  mensagemVazia?: string;
  acao?: ReactNode;
  children: ReactNode;
}

export function Card({ titulo, carregando, erro, vazio, mensagemVazia, acao, children }: CardProps) {
  return (
    <section className="rounded-lg border border-border-2 bg-bg-2 p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold sm:text-lg">{titulo}</h2>
        {acao}
      </header>

      {carregando && (
        <div className="flex items-center gap-2 py-8 text-sm text-fg/70">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Carregando…
        </div>
      )}

      {!carregando && erro && (
        <div className="flex items-center gap-2 rounded-md border border-border-2 py-8 text-sm text-fg/70" role="alert">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {erro}
        </div>
      )}

      {!carregando && !erro && vazio && (
        <p className="py-8 text-sm text-fg/70">{mensagemVazia ?? "Sem dados para o período/filtro selecionado."}</p>
      )}

      {!carregando && !erro && !vazio && children}
    </section>
  );
}
