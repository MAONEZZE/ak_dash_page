import { Avatar } from "./Avatar";
import type { PessoaGeral } from "../lib/tipos-api";

interface Props {
  titulo: string;
  pessoas: PessoaGeral[];
}

const ORDEM_VISUAL: Record<number, string> = { 1: "order-2", 2: "order-1", 3: "order-3" };
const TAMANHO_AVATAR: Record<number, number> = { 1: 81, 2: 63, 3: 63 };
const ALTURA_BASE: Record<number, string> = { 1: "pb-3 pt-2", 2: "pb-2 pt-1", 3: "pb-2 pt-1" };

function Degrau({ pessoa, posicao }: { pessoa: PessoaGeral; posicao: number }) {
  return (
    <div className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 text-center ${ORDEM_VISUAL[posicao]} ${ALTURA_BASE[posicao]}`}>
      <span className="font-display text-[19px] font-extrabold text-accent-fg">{posicao}º</span>
      <Avatar nome={pessoa.rotulo} imagemUrl={pessoa.imagem_url} tamanho={TAMANHO_AVATAR[posicao]} />
      <span className="line-clamp-1 text-[20px] font-bold tracking-tight">{pessoa.rotulo}</span>
      <span className="text-[17px] font-semibold text-fg/50">{pessoa.pontuacao?.toFixed(0)} pts</span>
    </div>
  );
}

/** Pódio top 3 de um cargo — 1º ao centro e maior. Oculto (com aviso) enquanto não há meta cadastrada, que é quando posicao vem null pra todo mundo. Altura de conteúdo — não estica pra preencher a coluna. */
export function RankingPodio({ titulo, pessoas }: Props) {
  const ranking = pessoas
    .filter((p): p is PessoaGeral & { posicao: number } => p.posicao !== null)
    .sort((a, b) => a.posicao - b.posicao)
    .slice(0, 3);

  return (
    <article className="glass-panel flex flex-col gap-3 rounded-2xl p-3.5 h-full ">
      <span className="text-[18px] font-semibold uppercase tracking-[0.13em] text-fg/56">{titulo}</span>
      {ranking.length === 0 ? (
        <p className="text-[19px] text-fg/50">Cadastre as metas em dash.metricas_metas pra ver o ranking.</p>
      ) : (
        <div className="flex items-end justify-center gap-1">
          {ranking.map((p, i) => (
            <Degrau key={p.id_user} pessoa={p} posicao={i + 1} />
          ))}
        </div>
      )}
    </article>
  );
}
