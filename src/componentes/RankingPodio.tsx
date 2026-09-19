import { Avatar } from "./Avatar";
import type { PessoaGeral } from "../lib/tipos-api";

interface Props {
  titulo: string;
  pessoas: PessoaGeral[];
}

const ORDEM_VISUAL: Record<number, string> = { 1: "order-2", 2: "order-1", 3: "order-3" };
/** 1º maior que os outros dois; medidas em vh pra o pódio encolher junto com a tela. */
const TAMANHO_AVATAR: Record<number, string> = {
  1: "clamp(52px,7.4vh,124px)",
  2: "clamp(42px,5.7vh,96px)",
  3: "clamp(42px,5.7vh,96px)",
};
const ALTURA_BASE: Record<number, string> = { 1: "pb-1 pt-0", 2: "pb-0 pt-1", 3: "pb-0 pt-1" };

function Degrau({ pessoa, posicao }: { pessoa: PessoaGeral; posicao: number }) {
  return (
    <div className={`flex flex-1 flex-col items-center gap-[clamp(1px,0.3vh,4px)] rounded-xl px-1 text-center ${ORDEM_VISUAL[posicao]} ${ALTURA_BASE[posicao]}`}>
      <span className="font-display text-[clamp(13px,1.6vh,24px)] font-extrabold leading-none text-accent-fg">{posicao}º</span>
      <Avatar nome={pessoa.rotulo} imagemUrl={pessoa.imagem_url} tamanho={TAMANHO_AVATAR[posicao]} />
      <span className="line-clamp-1 text-[clamp(14px,1.8vh,27px)] font-bold leading-tight tracking-tight">{pessoa.rotulo}</span>
      <span className="text-[clamp(14px,1.95vh,28px)] font-bold leading-none text-fg/55">{pessoa.pontuacao?.toFixed(0)} pts</span>
    </div>
  );
}

/**
 * Pódio top 3 de um cargo — 1º ao centro e maior. Pontuação da Geral é soma
 * bruta de quantidade, não percentual de meta: todo mundo do cargo entra no
 * ranking, cadastrado meta ou não. Só fica vazio se não houver ninguém no
 * cargo. Os dois pódios dividem em partes iguais a altura da coluna (a
 * mesma da tabela ao lado).
 */
export function RankingPodio({ titulo, pessoas }: Props) {
  const ranking = pessoas
    .filter((p): p is PessoaGeral & { posicao: number } => p.posicao !== null)
    .sort((a, b) => a.posicao - b.posicao)
    .slice(0, 3);

  return (
    <article className="glass-panel flex min-h-0 flex-1 flex-col gap-[clamp(4px,0.8vh,10px)] rounded-2xl p-[clamp(10px,1.4vh,16px)]">
      <span className="text-[clamp(13px,1.55vh,22px)] font-semibold uppercase leading-none tracking-[0.13em] text-fg/56">{titulo}</span>
      {ranking.length === 0 ? (
        <p className="text-[clamp(13px,1.6vh,24px)] leading-snug text-fg/50">Nenhuma pessoa ativa nesse cargo.</p>
      ) : (
        <div className="mb-4 flex flex-1 items-end justify-center gap-1">
          {ranking.map((p, i) => (
            <Degrau key={p.id_user} pessoa={p} posicao={i + 1} />
          ))}
        </div>
      )}
    </article>
  );
}
