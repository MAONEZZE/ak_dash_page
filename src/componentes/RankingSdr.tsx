import { formatarNumero } from "../lib/formato";
import type { SdrPaginaSdr } from "../lib/tipos-api";

/** A largura do trilho da barra é 120% da meta. */
const TETO_DA_BARRA = 1.2;
const CORES_MEDALHA = ["var(--color-ouro)", "var(--color-prata)", "var(--color-bronze)"];
const CINZA_MARCADOR = "var(--color-faint)";
const VERDE_ESCURO = "var(--color-ok-claro)"; // acumulado do mês
const VERDE_CLARO = "var(--color-accent)"; // inscrições de hoje

/** Dias decorridos do mês `[inicio, fim]` em `agora`, fracionados pela hora (dia 25 às 18h49 ≈ 24,78). */
export function diasDecorridos(inicio: string, fim: string, agora: Date): { decorridos: number; doMes: number } {
  const [ai, mi, di] = inicio.split("-").map(Number);
  const [af, mf, df] = fim.split("-").map(Number);
  const doMes = df - di + 1;
  if (agora >= new Date(af, mf - 1, df + 1)) return { decorridos: doMes, doMes };
  const dias = (agora.getTime() - new Date(ai, mi - 1, di).getTime()) / 86_400_000;
  return { decorridos: Math.max(dias, 0), doMes };
}

function Trofeu({ cor, tamanho = 22 }: { cor: string; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}

function Medalha({ cor, tamanho = 22 }: { cor: string; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2h4l2 6H9L7 2Zm6 0h4l-2 6h-4l2-6Z" fill={cor} opacity="0.7" />
      <circle cx="12" cy="15" r="6" fill={cor} />
      <circle cx="12" cy="15" r="3.6" fill="none" stroke="var(--color-offwhite)" strokeOpacity="0.6" strokeWidth="1.2" />
    </svg>
  );
}

function Posicao({ posicao }: { posicao: number }) {
  if (posicao <= 3) {
    return (
      <span data-posicao={`${posicao}º`} title={`${posicao}º`} className="flex shrink-0">
        <Medalha cor={CORES_MEDALHA[posicao - 1]} tamanho={26} />
      </span>
    );
  }
  return (
    <span data-posicao={`${posicao}º`} className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-track text-[12px] font-semibold text-muted">
      {posicao}º
    </span>
  );
}

function Bolinha({ cor }: { cor: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: cor }} />;
}

const MARCADORES = [
  { fracao: 0.7, rotulo: "70% da meta", cor: CORES_MEDALHA[2], trofeu: false },
  { fracao: 1, rotulo: "100% da meta", cor: CORES_MEDALHA[0], trofeu: false },
  { fracao: TETO_DA_BARRA, rotulo: "120% da meta", cor: CORES_MEDALHA[0], trofeu: true },
];

function LinhaSdr({ s, posicao, decorridos, doMes }: { s: SdrPaginaSdr; posicao: number; decorridos: number; doMes: number }) {
  const { negocios, inscricoes, inscricoes_hoje, meta } = s.ranking_mes;
  const metaValida = meta !== null && meta > 0 ? meta : null;
  const escala = metaValida !== null ? metaValida * TETO_DA_BARRA : 0;
  // Largura sobre meta × 1,2, cortada no fim do trilho.
  const largura = (v: number) => (escala > 0 ? `${(Math.min(v, escala) / escala) * 100}%` : "0%");
  const projecao = decorridos > 0 ? Math.round((inscricoes / decorridos) * doMes) : inscricoes;
  const pctProjecao = metaValida !== null ? Math.round((projecao / metaValida) * 100) : null;
  const ritmo = doMes > 0 ? (decorridos / doMes / TETO_DA_BARRA) * 100 : 0;

  return (
    <li data-sdr={s.id_user} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Posicao posicao={posicao} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[18px] font-medium leading-tight">{s.nome}</span>
            <span data-negocios className="text-[13px] text-muted">
              {formatarNumero(negocios)} {negocios === 1 ? "negócio" : "negócios"}
            </span>
          </div>
        </div>
        <div data-numeros className="flex shrink-0 items-baseline gap-2">
          {inscricoes_hoje > 0 && (
            <span data-hoje className="text-[16px] font-semibold text-ok">+{formatarNumero(inscricoes_hoje)} hoje</span>
          )}
          <span data-total className="text-[22px] font-bold text-fogo">{formatarNumero(inscricoes)}</span>
          <span className="text-[14px] text-faint">/ {metaValida !== null ? formatarNumero(metaValida) : "—"}</span>
          {metaValida !== null && (
            <span data-pct className="text-[14px] font-bold">{Math.round((inscricoes / metaValida) * 100)}%</span>
          )}
        </div>
      </div>

      <div className="relative pt-6">
        {metaValida !== null &&
          MARCADORES.map((m) => {
            const atingido = inscricoes >= metaValida * m.fracao;
            const cor = atingido ? m.cor : CINZA_MARCADOR;
            return (
              <span
                key={m.rotulo}
                data-marcador={m.fracao}
                data-atingido={atingido ? "true" : "false"}
                title={m.rotulo}
                className="absolute top-0 flex"
                style={{
                  left: `${(m.fracao / TETO_DA_BARRA) * 100}%`,
                  transform: m.trofeu ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                {m.trofeu ? <Trofeu cor={cor} tamanho={20} /> : <Medalha cor={cor} tamanho={20} />}
              </span>
            );
          })}
        <div
          className="relative h-2 overflow-hidden rounded-full bg-track"
          role="progressbar"
          aria-label={`Inscrições de ${s.nome}`}
          aria-valuenow={inscricoes}
          aria-valuemin={0}
          aria-valuemax={metaValida ?? undefined}
        >
          {/* Sobrepostas, as duas a partir do início: o acumulado do mês atrás, o dia na frente. */}
          <span data-segmento="acumulado" className="absolute inset-y-0 left-0" style={{ width: largura(inscricoes), background: VERDE_ESCURO }} />
          <span data-segmento="hoje" className="absolute inset-y-0 left-0" style={{ width: largura(inscricoes_hoje), background: VERDE_CLARO }} />
          <span data-ritmo className="absolute inset-y-0 w-px bg-muted" style={{ left: `${ritmo}%` }} />
        </div>
      </div>

      <p data-run-rate className="text-[13px] text-muted">
        Run rate · previsão de fechamento:{" "}
        <span className={`font-semibold ${pctProjecao !== null && pctProjecao >= 100 ? "text-ok" : "text-fogo"}`}>
          {formatarNumero(projecao)} {projecao === 1 ? "inscrição" : "inscrições"}
          {pctProjecao !== null && ` (${pctProjecao}% da meta)`}
        </span>
      </p>
    </li>
  );
}

/**
 * Card "Ranking SDR": inscrições do mês `mesRanking` por SDR (estágio Inscrito do Pipedrive) contra a
 * meta de inscrições do mês, com o dia em verde claro; embaixo do nome, os negócios de que o SDR é dono.
 * O badge é o total de inscritos do evento no SED no mês. Ordena por inscrições, decrescente.
 */
export function RankingSdr({
  sdrs,
  mesRanking,
  inscritosSed,
  agora = new Date(),
}: {
  sdrs: SdrPaginaSdr[];
  mesRanking: { inicio: string; fim: string } | null;
  inscritosSed: number | null;
  agora?: Date;
}) {
  const ordenados = [...sdrs].sort(
    (a, b) => b.ranking_mes.inscricoes - a.ranking_mes.inscricoes || b.ranking_mes.negocios - a.ranking_mes.negocios,
  );
  const metaDoMes = ordenados.reduce((soma, s) => soma + (s.ranking_mes.meta ?? 0), 0);
  const { decorridos, doMes } = mesRanking ? diasDecorridos(mesRanking.inicio, mesRanking.fim, agora) : { decorridos: 0, doMes: 0 };

  return (
    <article
      className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto rounded-[16px] bg-surface p-6 shadow-sm"
      aria-label="Ranking SDR — Leads gerados"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Trofeu cor="var(--color-fogo)" />
          <h2 className="text-[20px] font-semibold">Ranking SDR — Leads gerados</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          <span>
            Meta do mês: <strong>{formatarNumero(metaDoMes)}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex items-center gap-1"><Bolinha cor={VERDE_ESCURO} /> Acumulado do mês</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Bolinha cor={VERDE_CLARO} /> Inscrições de hoje</span>
          </span>
          {inscritosSed !== null && (
            <span data-total-geral className="rounded-full bg-track px-2.5 py-0.5 font-bold">
              {formatarNumero(inscritosSed)} inscritos
            </span>
          )}
        </div>
      </header>
      {ordenados.length === 0 ? (
        <p className="text-[14px] text-muted">Nenhum SDR ativo.</p>
      ) : (
        <ol aria-label="Ranking SDR" className="flex flex-col gap-4">
          {ordenados.map((s, i) => (
            <LinhaSdr key={s.id_user} s={s} posicao={i + 1} decorridos={decorridos} doMes={doMes} />
          ))}
        </ol>
      )}
    </article>
  );
}
