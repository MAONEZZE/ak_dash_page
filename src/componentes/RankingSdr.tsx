import { formatarNumero } from "../lib/formato";
import { fotoConta } from "../lib/fotos-contas";
import type { SdrPaginaSdr } from "../lib/tipos-api";
import { Avatar } from "./Avatar";

/**
 * Ranking vertical de SDRs da página SDR. Lista na ordem que vem do BFF
 * (posição e pontuação já calculadas lá); o 1º lugar recebe destaque.
 */
export function RankingSdr({ sdrs }: { sdrs: SdrPaginaSdr[] }) {
  return (
    <article
      className="card-pastel pastel-verde-escuro rounded-[24px] flex h-full min-h-0 flex-col gap-[clamp(6px,1vh,14px)] p-[clamp(10px,1.4vh,18px)]"
      aria-label="Ranking"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[clamp(19.5px,2.325vh,33px)] font-semibold uppercase leading-none tracking-[0.13em] text-muted">Ranking</span>
        <span className="rounded-full bg-ok-bg px-3.5 py-1.5 text-[clamp(16.5px,1.95vh,27px)] font-bold uppercase leading-none tracking-[0.06em] text-sdr">
          SDR
        </span>
      </div>
      {sdrs.length === 0 ? (
        <p className="text-[clamp(19.5px,2.4vh,36px)] leading-snug text-muted">Nenhum SDR ativo.</p>
      ) : (
        <ol aria-label="Ranking SDR" className="flex min-h-0 flex-1 flex-col justify-around overflow-hidden">
          {sdrs.map((s) => {
            const lider = s.posicao === 1;
            return (
              <li
                key={s.id_user}
                data-lider={lider ? "true" : undefined}
                className={`flex min-w-0 items-center gap-[clamp(8px,1vw,16px)] rounded-lg px-2 py-[clamp(3px,0.6vh,8px)] ${lider ? "bg-warn-bar/20" : ""}`}
              >
                <span data-posicao className="w-[clamp(36px,3.2vw,56px)] shrink-0 font-display text-[clamp(21px,2.7vh,42px)] font-extrabold leading-none">
                  {s.posicao}º
                </span>
                <Avatar nome={s.nome} imagemUrl={s.imagem_url ?? fotoConta(s.nome)} tamanho="clamp(40px,5.4vh,80px)" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-1 text-[clamp(19.5px,2.4vh,36px)] font-bold leading-tight tracking-tight">{s.nome}</span>
                  <span className="line-clamp-1 text-[clamp(16.5px,1.95vh,27px)] leading-tight text-muted">
                    {s.ligacoes} ligações · {s.inscricoes} inscrições
                  </span>
                </div>
                <span data-pontos className="shrink-0 text-[clamp(18px,2.175vh,33px)] font-bold leading-none text-muted">
                  {formatarNumero(s.pontuacao)} pts
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </article>
  );
}
