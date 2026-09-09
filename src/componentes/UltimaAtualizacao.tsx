import { RefreshCw } from "lucide-react";
import { formatarHora } from "../lib/formato";

interface UltimaAtualizacaoProps {
  atualizadoEm: Date;
  atualizando: boolean;
  aoAtualizar: () => void;
}

export function UltimaAtualizacao({ atualizadoEm, atualizando, aoAtualizar }: UltimaAtualizacaoProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-fg/70">
      <span>Atualizado às {formatarHora(atualizadoEm)}</span>
      <button
        type="button"
        onClick={aoAtualizar}
        disabled={atualizando}
        className="inline-flex items-center gap-1 rounded-md border border-border-2 px-2 py-1 font-medium text-fg transition-opacity hover:opacity-80 disabled:opacity-50"
      >
        <RefreshCw className={`size-3 ${atualizando ? "animate-spin" : ""}`} aria-hidden />
        Atualizar
      </button>
    </div>
  );
}
