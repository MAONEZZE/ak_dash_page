import { useSearchParams } from "react-router-dom";
import type { Granularidade, Pessoa } from "../lib/tipos-api";

interface FiltrosProps {
  pessoasDisponiveis: Pessoa[];
}

function hoje(): Date {
  return new Date();
}

function paraPeriodo(granularidade: Granularidade, data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  if (granularidade === "dia") return `${ano}-${mes}-${dia}`;
  if (granularidade === "mes") return `${ano}-${mes}`;
  return `${ano}`;
}

function ehSdr(pessoa: Pessoa): boolean {
  return pessoa.cargo.toLowerCase().includes("sdr");
}

/** Lê os filtros atuais da querystring — mesma leitura usada pelo componente Filtros e pelas páginas que consomem a API. */
export function useFiltrosAtuais() {
  const [params] = useSearchParams();
  const granularidade = (params.get("granularidade") as Granularidade | null) ?? "mes";
  const periodo = params.get("periodo") ?? paraPeriodo("mes", hoje());
  const pessoas = params.getAll("pessoas");
  return { granularidade, periodo, pessoas };
}

function Chip({
  pressionado,
  onClick,
  title,
  children,
}: {
  pressionado: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressionado}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-[20px] border px-3 py-1 text-sm font-medium transition-colors ${
        pressionado
          ? "border-accent-fg bg-accent-fg text-bg-2"
          : "border-border-2 text-fg/80 hover:opacity-80"
      }`}
    >
      <span
        aria-hidden
        className={`size-2 shrink-0 rounded-full ${pressionado ? "bg-bg-2" : "bg-fg/40"}`}
      />
      {children}
    </button>
  );
}

export function Filtros({ pessoasDisponiveis }: FiltrosProps) {
  const [params, setParams] = useSearchParams();

  const granularidade = (params.get("granularidade") as Granularidade | null) ?? "mes";
  const periodo = params.get("periodo") ?? paraPeriodo("mes", hoje());
  const pessoasSelecionadas = params.getAll("pessoas");

  function atualizar(proximos: { granularidade?: Granularidade; periodo?: string; pessoas?: string[] }) {
    const novo = new URLSearchParams(params);
    if (proximos.granularidade) novo.set("granularidade", proximos.granularidade);
    if (proximos.periodo !== undefined) novo.set("periodo", proximos.periodo);
    if (proximos.pessoas !== undefined) {
      novo.delete("pessoas");
      for (const email of proximos.pessoas) novo.append("pessoas", email);
    }
    setParams(novo, { replace: true });
  }

  function aplicarAtalho(g: Granularidade) {
    atualizar({ granularidade: g, periodo: paraPeriodo(g, hoje()) });
  }

  function alternarPessoa(email: string) {
    const proximo = pessoasSelecionadas.includes(email)
      ? pessoasSelecionadas.filter((e) => e !== email)
      : [...pessoasSelecionadas, email];
    atualizar({ pessoas: proximo });
  }

  const sdrs = pessoasDisponiveis.filter(ehSdr);
  const closers = pessoasDisponiveis.filter((p) => !ehSdr(p));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-2 bg-bg-2 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1" role="group" aria-label="Granularidade">
          {(["dia", "mes", "ano"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => atualizar({ granularidade: g, periodo: paraPeriodo(g, hoje()) })}
              aria-pressed={granularidade === g}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                granularidade === g ? "bg-accent-fg text-bg-2" : "border border-border-2 text-fg/80 hover:opacity-80"
              }`}
            >
              {g === "dia" ? "Dia" : g === "mes" ? "Mês" : "Ano"}
            </button>
          ))}
        </div>

        <input
          type={granularidade === "dia" ? "date" : granularidade === "mes" ? "month" : "number"}
          value={periodo}
          onChange={(e) => atualizar({ periodo: e.target.value })}
          className="rounded-md border border-border-2 bg-bg px-2 py-1.5 text-sm text-fg tabular-nums"
          aria-label="Período"
        />

        <div className="flex gap-1">
          <button type="button" onClick={() => aplicarAtalho("dia")} className="rounded-md border border-border-2 px-2 py-1 text-xs text-fg/80 hover:opacity-80">
            Hoje
          </button>
          <button type="button" onClick={() => aplicarAtalho("mes")} className="rounded-md border border-border-2 px-2 py-1 text-xs text-fg/80 hover:opacity-80">
            Este mês
          </button>
          <button type="button" onClick={() => aplicarAtalho("ano")} className="rounded-md border border-border-2 px-2 py-1 text-xs text-fg/80 hover:opacity-80">
            Este ano
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Pessoas">
        <Chip pressionado={pessoasSelecionadas.length === 0} onClick={() => atualizar({ pessoas: [] })}>
          Todas
        </Chip>

        {sdrs.length > 0 && (
          <>
            <span className="text-xs text-fg/50">SDRs</span>
            {sdrs.map((pessoa) => (
              <Chip
                key={pessoa.email}
                pressionado={pessoasSelecionadas.includes(pessoa.email)}
                onClick={() => alternarPessoa(pessoa.email)}
                title={`${pessoa.nome} · ${pessoa.email}`}
              >
                {pessoa.nome}
              </Chip>
            ))}
          </>
        )}

        {closers.length > 0 && (
          <>
            <span className="text-xs text-fg/50">Closers</span>
            {closers.map((pessoa) => (
              <Chip
                key={pessoa.email}
                pressionado={pessoasSelecionadas.includes(pessoa.email)}
                onClick={() => alternarPessoa(pessoa.email)}
                title={`${pessoa.nome} · ${pessoa.email}`}
              >
                {pessoa.nome}
              </Chip>
            ))}
          </>
        )}

        {pessoasDisponiveis.length === 0 && <p className="text-xs text-fg/70">Nenhuma pessoa ativa.</p>}
      </div>
    </div>
  );
}
