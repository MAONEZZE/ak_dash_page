import { formatarNumero, nomeExibicao } from "../lib/formato";
import type { Cargo, PessoaComercial } from "../lib/tipos-api";
import { Avatar } from "./Avatar";

interface Props {
  cargo: Cargo;
  pessoas: PessoaComercial[];
}

const TITULO: Record<Cargo, string> = { seller: "Ranking Seller", sdr: "Ranking SDR", closer: "Ranking Closer" };
const SELO: Record<Cargo, string> = { seller: "Seller", sdr: "SDR", closer: "Closer" };
const COR_SELO: Record<Cargo, string> = { seller: "bg-warn-bg text-warn", sdr: "bg-ok-bg text-sdr", closer: "bg-closer-bg text-closer" };

/**
 * Texto e avatares 1,5× o desenho original (pedido de 2026-11-02). Os degraus
 * cresceram menos: com três rankings na lateral da Time o 1º lugar não cabia.
 */

/** Ordem visual 2º | 1º | 3º, com o degrau do 1º mais alto. */
const ORDEM_VISUAL: Record<number, string> = { 1: "order-2", 2: "order-1", 3: "order-3" };
const ALTURA_DEGRAU: Record<number, string> = {
  1: "h-[clamp(48px,5.4vh,96px)]",
  2: "h-[clamp(36px,3.8vh,68px)]",
  3: "h-[clamp(28px,2.7vh,50px)]",
};
/** Ouro, prata e bronze com os tokens da marca (sem hex novo — ver tests/brand.test.ts). */
const COR_DEGRAU: Record<number, string> = { 1: "bg-warn-bar", 2: "bg-faint", 3: "bg-warn" };
const TAMANHO_AVATAR: Record<number, string> = {
  1: "clamp(72px,9.6vh,160px)",
  2: "clamp(66px,8.4vh,138px)",
  3: "clamp(66px,8.4vh,138px)",
};

function Degrau({ pessoa, posicao }: { pessoa: PessoaComercial; posicao: number }) {
  const nome = nomeExibicao(pessoa.nome, pessoa.email);
  return (
    <div className={`flex min-w-0 flex-1 flex-col items-center justify-end gap-[clamp(3px,0.6vh,9px)] text-center ${ORDEM_VISUAL[posicao]}`}>
      <Avatar nome={nome} imagemUrl={pessoa.imagem_url} tamanho={TAMANHO_AVATAR[posicao]} />
      <span className="line-clamp-1 max-w-full text-[clamp(19.5px,2.4vh,36px)] font-bold leading-tight tracking-tight">{nome}</span>
      <span className="text-[clamp(18px,2.175vh,33px)] font-bold leading-none text-muted">
        {formatarNumero(Math.round(pessoa.pontuacao_total!))} pts
      </span>
      <div
        className={`flex w-full items-start justify-center rounded-t-lg pt-1 font-display text-[clamp(21px,2.7vh,42px)] font-extrabold leading-none text-surface ${COR_DEGRAU[posicao]} ${ALTURA_DEGRAU[posicao]}`}
      >
        {posicao}º
      </div>
    </div>
  );
}

/**
 * Pódio top 3. Usa a classificação e pontuação comercial calculadas no BFF.
 * O card estica até a altura que o pai der, com o pódio no pé.
 */
export function RankingPodio({ cargo, pessoas }: Props) {
  const ranking = pessoas
    .filter((p): p is PessoaComercial & { posicao: number; pontuacao_total: number } => p.posicao !== null && p.pontuacao_total !== null)
    .sort((a, b) => a.posicao - b.posicao)
    .slice(0, 3);

  return (
    <article
      className="card-pastel pastel-verde-escuro rounded-[24px] flex min-h-[320px] min-[1201px]:min-h-0 flex-1 flex-col gap-[clamp(6px,1vh,14px)] p-[clamp(10px,1.4vh,18px)]"
      aria-label={TITULO[cargo]}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[clamp(19.5px,2.325vh,33px)] font-semibold uppercase leading-none tracking-[0.13em] text-muted">Ranking</span>
        <span
          className={`rounded-full px-3.5 py-1.5 text-[clamp(16.5px,1.95vh,27px)] font-bold uppercase leading-none tracking-[0.06em] ${COR_SELO[cargo]}`}
        >
          {SELO[cargo]}
        </span>
      </div>
      {ranking.length === 0 ? (
        <p className="text-[clamp(19.5px,2.4vh,36px)] leading-snug text-muted">Nenhuma pessoa ativa nesse cargo.</p>
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
