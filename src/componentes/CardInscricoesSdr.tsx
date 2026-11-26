import { formatarNumero } from "../lib/formato";
import { fotoConta } from "../lib/fotos-contas";
import { umaCasa } from "../lib/funil";
import { statusDoAtingimento } from "../lib/atingimento";
import type { StatusRitmo } from "../lib/ritmo";
import type { SdrPaginaSdr } from "../lib/tipos-api";
import { Avatar } from "./Avatar";

const COR_BARRA: Record<StatusRitmo, string> = {
  no_ritmo: "bg-ok",
  atras: "bg-warn",
  muito_atras: "bg-bad",
  sem_meta: "bg-faint",
};

function LinhaSdr({ sdr }: { sdr: SdrPaginaSdr }) {
  const meta = sdr.meta_inscricoes;
  const pct = meta ? (sdr.inscricoes / meta) * 100 : 0;
  const status = statusDoAtingimento(meta ? pct : null);
  const previsao = sdr.previsao;

  return (
    <div data-sdr={sdr.nome} className="flex min-w-0 flex-col gap-[clamp(3px,0.6vh,8px)]">
      <div className="flex items-center gap-[clamp(6px,1vh,12px)]">
        <span role="img" aria-label={sdr.nome} className="flex shrink-0">
          <Avatar nome={sdr.nome} imagemUrl={sdr.imagem_url ?? fotoConta(sdr.nome)} tamanho="clamp(36px,4.8vh,64px)" />
        </span>
        <span className="line-clamp-1 min-w-0 flex-1 text-[clamp(18px,2.2vh,32px)] font-semibold leading-tight">{sdr.nome}</span>
        <span className="shrink-0 text-[clamp(16px,2vh,28px)] font-bold leading-none text-muted">
          {meta !== null
            ? `${formatarNumero(sdr.inscricoes)} / ${formatarNumero(meta)}`
            : formatarNumero(sdr.inscricoes)}
        </span>
      </div>
      <div className="relative h-[clamp(8px,1.2vh,16px)] w-full overflow-hidden rounded-full bg-surface-2">
        <div
          data-barra
          data-status={status}
          className={`h-full rounded-full ${COR_BARRA[status]}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {previsao && (
        <p data-previsao className="text-[clamp(14px,1.8vh,26px)] leading-snug text-muted">
          {`Previsão até o evento: ${formatarNumero(previsao.valor)}${
            previsao.pct_meta !== null ? ` (${umaCasa(previsao.pct_meta)}% da meta)` : ""
          }`}
        </p>
      )}
    </div>
  );
}

/**
 * Inscrições do período por SDR: barra pelo atingimento da meta (terços),
 * previsão até o evento e o total do time no canto do header.
 */
export function CardInscricoesSdr({ sdrs }: { sdrs: SdrPaginaSdr[] }) {
  const total = sdrs.reduce((soma, s) => soma + s.inscricoes, 0);

  return (
    <section
      aria-label="Inscrições Realizadas"
      className="card-pastel rounded-[24px] flex h-full flex-col gap-[clamp(8px,1.4vh,18px)] p-[clamp(10px,1.4vh,18px)]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[clamp(19.5px,2.325vh,33px)] font-semibold uppercase leading-none tracking-[0.13em] text-muted">
          Inscrições Realizadas
        </h2>
        <span data-total className="font-display text-[clamp(24px,3.2vh,46px)] font-extrabold leading-none">
          {formatarNumero(total)}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-around gap-[clamp(6px,1vh,14px)]">
        {sdrs.map((s) => (
          <LinhaSdr key={s.id_user} sdr={s} />
        ))}
      </div>
    </section>
  );
}
