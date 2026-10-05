import { formatarNumero } from "../lib/formato";
import type { Cargo, PessoaGeral } from "../lib/tipos-api";
import { Avatar } from "./Avatar";

interface Props {
  cargo: Cargo;
  pessoas: PessoaGeral[];
}

const TITULO: Record<Cargo, string> = { sdr: "Ranking SDR", closer: "Ranking Closer" };
const COR_SELO: Record<Cargo, string> = { sdr: "bg-ok-bg text-sdr", closer: "bg-closer-bg text-closer" };

/** Ordem visual 2º | 1º | 3º, com o degrau do 1º mais alto. */
const ORDEM_VISUAL: Record<number, string> = { 1: "order-2", 2: "order-1", 3: "order-3" };
const ALTURA_DEGRAU: Record<number, string> = {
  1: "h-[clamp(44px,6vh,96px)]",
  2: "h-[clamp(32px,4.2vh,68px)]",
  3: "h-[clamp(24px,3vh,50px)]",
};
/** Ouro, prata e bronze com os tokens da marca (sem hex novo — ver tests/brand.test.ts). */
const COR_DEGRAU: Record<number, string> = { 1: "bg-warn-bar", 2: "bg-faint", 3: "bg-warn" };
const TAMANHO_AVATAR: Record<number, string> = {
  1: "clamp(52px,7vh,116px)",
  2: "clamp(44px,5.6vh,92px)",
  3: "clamp(44px,5.6vh,92px)",
};

function Degrau({ pessoa, posicao }: { pessoa: PessoaGeral; posicao: number }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center justify-end gap-[clamp(2px,0.4vh,6px)] text-center ${ORDEM_VISUAL[posicao]}`}>
      <Avatar nome={pessoa.rotulo} imagemUrl={pessoa.imagem_url} tamanho={TAMANHO_AVATAR[posicao]} />
      <span className="line-clamp-1 max-w-full text-[clamp(13px,1.6vh,24px)] font-bold leading-tight tracking-tight">{pessoa.rotulo}</span>
      <span className="text-[clamp(12px,1.45vh,22px)] font-bold leading-none text-muted">
        {pessoa.pontuacao === null ? "—" : formatarNumero(Math.round(pessoa.pontuacao))} pts
      </span>
      <div
        className={`flex w-full items-start justify-center rounded-t-lg pt-1 font-display text-[clamp(14px,1.8vh,28px)] font-extrabold leading-none text-surface ${COR_DEGRAU[posicao]} ${ALTURA_DEGRAU[posicao]}`}
      >
        {posicao}º
      </div>
    </div>
  );
}

/**
 * Pódio top 3 de um cargo. Pontuação = realizado × peso por cargo (calculada
 * no BFF, `app/pontuacao.py`): todo mundo do cargo entra no ranking, com meta
 * ou sem. O card estica até a altura que o pai der, com o pódio no pé.
 */
export function RankingPodio({ cargo, pessoas }: Props) {
  const ranking = pessoas
    .filter((p): p is PessoaGeral & { posicao: number } => p.cargo === cargo && p.posicao !== null)
    .sort((a, b) => a.posicao - b.posicao)
    .slice(0, 3);

  return (
    <article
      className="glass-panel flex min-h-0 flex-1 flex-col gap-[clamp(6px,1vh,14px)] rounded-[24px] p-[clamp(10px,1.4vh,18px)]"
      aria-label={TITULO[cargo]}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[clamp(13px,1.55vh,22px)] font-semibold uppercase leading-none tracking-[0.13em] text-muted">Ranking</span>
        <span
          className={`rounded-full px-2.5 py-1 text-[clamp(11px,1.3vh,18px)] font-bold uppercase leading-none tracking-[0.06em] ${COR_SELO[cargo]}`}
        >
          {cargo === "sdr" ? "SDR" : "Closer"}
        </span>
      </div>
      {ranking.length === 0 ? (
        <p className="text-[clamp(13px,1.6vh,24px)] leading-snug text-muted">Nenhuma pessoa ativa nesse cargo.</p>
      ) : (
        <div className="flex min-h-0 flex-1 items-end justify-center gap-1.5">
          {ranking.map((p, i) => (
            <Degrau key={p.id_user} pessoa={p} posicao={i + 1} />
          ))}
        </div>
      )}
    </article>
  );
}
