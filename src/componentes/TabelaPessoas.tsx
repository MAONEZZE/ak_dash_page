import { formatarNumero } from "../lib/formato";
import { Avatar } from "./Avatar";
import type { PessoaGeral } from "../lib/tipos-api";

interface Props {
  pessoas: PessoaGeral[];
}

/** Avatar da linha: menor item que ainda identifica a pessoa — é ele que dita a altura da linha. */
const AVATAR_LINHA = "clamp(24px,3vh,36px)";

function valorTexto(v: number | null): string {
  return v === null ? "—" : formatarNumero(v);
}

/**
 * Um card por cargo — verde pastel nos SDRs, azul pastel nos closers (ver
 * --painel-sdr-* / --painel-closer-* em globals.css). `flexGrow` proporcional
 * ao número de linhas: quando sobra altura na coluna, o card de 4 pessoas fica
 * com mais sobra que o de 3, e as duas tabelas mantêm o mesmo respiro por linha.
 */
function CardCargo({ titulo, pessoas, painel }: { titulo: string; pessoas: PessoaGeral[]; painel: string }) {
  if (pessoas.length === 0) return null;
  const colunas = pessoas[0].metricas;

  return (
    <article
      className={`${painel} flex min-h-0 w-full min-w-0 flex-col gap-[clamp(2px,0.45vh,6px)] overflow-auto rounded-2xl px-[clamp(12px,1.1vw,20px)] py-[clamp(8px,1.2vh,14px)]`}
      style={{ flexGrow: pessoas.length }}
    >
      <span className="text-[clamp(13px,1.55vh,18px)] font-semibold uppercase leading-none tracking-[0.13em] text-fg/56">{titulo}</span>
      {/* `flex-1`: a sobra de altura da coluna vira respiro entre as linhas, em vez de um vão morto no pé do card. */}
      <table className="w-full flex-1 border-collapse">
        <thead>
          <tr className="border-b border-border-2">
            {/* A coluna da pessoa se explica pela foto + nome — o rótulo só existe pra leitor de tela. */}
            <th className="py-[clamp(3px,0.5vh,6px)] pr-3 text-left">
              <span className="sr-only">Pessoa</span>
            </th>
            {colunas.map((c) => (
              <th
                key={c.metrica}
                className="px-3 py-[clamp(3px,0.5vh,6px)] text-left text-[clamp(12px,1.4vh,16px)] font-semibold uppercase leading-none tracking-[0.08em] text-fg/50"
              >
                {c.nome_exibicao}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pessoas.map((p) => (
            <tr key={p.id_user} className="border-b border-border-2 last:border-0">
              <td className="py-[clamp(2px,0.42vh,5px)]">
                <div className="flex items-center gap-2">
                  <Avatar nome={p.rotulo} imagemUrl={p.imagem_url} tamanho={AVATAR_LINHA} />
                  <span className="text-[clamp(15px,1.95vh,23px)] font-semibold leading-none tracking-tight">{p.rotulo}</span>
                </div>
              </td>
              {p.metricas.map((m) => (
                <td
                  key={m.metrica}
                  className="whitespace-nowrap px-3 py-[clamp(2px,0.42vh,5px)] font-display text-[clamp(15px,1.95vh,23px)] font-bold leading-none tracking-tight"
                >
                  {valorTexto(m.realizado)}
                  <span className="ml-1 text-[clamp(13px,1.7vh,20px)] font-semibold text-fg/45">/ {valorTexto(m.meta)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

/**
 * As 7 pessoas ativas em dois cards — SDRs em cima, closers embaixo. Colunas
 * diferem por cargo (o payload já vem com as colunas certas). Altura é a do
 * conteúdo, no mínimo possível (paddings e entrelinhas colados no texto): o
 * espaço que sobra na tela é dos 8 cards de KPI acima.
 */
export function TabelaPessoas({ pessoas }: Props) {
  const sdrs = pessoas.filter((p) => p.cargo === "sdr");
  const closers = pessoas.filter((p) => p.cargo === "closer");

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2">
      <CardCargo titulo="SDRs" pessoas={sdrs} painel="glass-panel-sdr" />
      <CardCargo titulo="Closers" pessoas={closers} painel="glass-panel-closer" />
    </div>
  );
}
