import { formatarNumero } from "../lib/formato";
import { Avatar } from "./Avatar";
import type { PessoaGeral } from "../lib/tipos-api";

interface Props {
  pessoas: PessoaGeral[];
}

function valorTexto(v: number | null): string {
  return v === null ? "—" : formatarNumero(v);
}

function Bloco({ titulo, pessoas }: { titulo: string; pessoas: PessoaGeral[] }) {
  if (pessoas.length === 0) return null;
  const colunas = pessoas[0].metricas;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[19px] font-semibold uppercase tracking-[0.13em] text-fg/56">{titulo}</span>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-2">
            <th className="py-1.5 pr-3 text-left text-[16px] font-semibold uppercase tracking-[0.08em] text-fg/50">Pessoa</th>
            {colunas.map((c) => (
              <th key={c.metrica} className="py-1.5 px-3 text-left text-[16px] font-semibold uppercase tracking-[0.08em] text-fg/50">
                {c.nome_exibicao}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pessoas.map((p) => (
            <tr key={p.id_user} className="border-b border-border-2 last:border-0">
              <td className="py-1.5">
                <div className="flex items-center gap-2">
                  <Avatar nome={p.rotulo} imagemUrl={p.imagem_url} tamanho={42} />
                  <span className="text-[21px] font-semibold tracking-tight">{p.rotulo}</span>
                </div>
              </td>
              {p.metricas.map((m) => (
                <td key={m.metrica} className="py-1.5 px-3 font-display text-[21px] font-bold tracking-tight">
                  {valorTexto(m.realizado)}
                  <span className="ml-1 text-[19px] font-semibold text-fg/45">/ {valorTexto(m.meta)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Tabela das 7 pessoas ativas, SDRs primeiro — colunas diferem por cargo (o payload já vem com as colunas certas). Ocupa a altura toda da linha (a Geral reservou o espaço liberado pelos cards compactos pra ela). */
export function TabelaPessoas({ pessoas }: Props) {
  const sdrs = pessoas.filter((p) => p.cargo === "sdr");
  const closers = pessoas.filter((p) => p.cargo === "closer");

  // w-233
  return (
    <article className="glass-panel flex h-full w-full min-w-0 flex-col gap-3 overflow-x-auto rounded-2xl p-3 pl-5 pr-5">
      <Bloco titulo="SDRs" pessoas={sdrs} />
      <Bloco titulo="Closers" pessoas={closers} />
    </article>
  );
}
