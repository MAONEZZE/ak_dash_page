import type { SdrPaginaSdr } from "../lib/tipos-api";

const W = 900;
const H = 240;
const CORES = ["var(--color-brand)", "var(--color-closer)"];

/** "2026-11-20" -> "20/11": fatia a string para não passar por fuso. */
function diaMes(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/**
 * Ritmo de inscrições da página de SDR: para cada SDR, o acumulado cheio (só
 * até hoje) e a pontilhada do ritmo (a janela inteira). Mesmo SVG esticado do
 * `GraficoAreaMeta`, então os rótulos do eixo X são HTML em %.
 */
export function GraficoRitmoSdr({
  janela,
  sdrs,
  titulo,
  semEvento = false,
}: {
  janela: { inicio: string; fim: string } | null;
  sdrs: SdrPaginaSdr[];
  titulo: string;
  semEvento?: boolean;
}) {
  const cabecalho = `Ritmo de inscrições — ${titulo}`;
  const serie = sdrs[0]?.serie_evento ?? [];

  if (!janela || serie.length === 0) {
    const vazio = !janela && semEvento ? "Nenhum evento" : "Evento ainda sem inscrições";
    return (
      <article className="glass-panel flex h-full min-h-0 min-w-0 flex-col gap-3 rounded-[24px] p-5">
        <span className="text-[15px] font-semibold uppercase tracking-[0.13em] text-muted">{cabecalho}</span>
        <p className="text-lg text-muted">{vazio}</p>
      </article>
    );
  }

  const n = serie.length;
  const fracaoX = (i: number) => (n > 1 ? i / (n - 1) : 0);
  const passo = Math.ceil(n / 8);
  const mostraRotulo = (i: number) =>
    i === 0 || i === n - 1 || (i % passo === 0 && n - 1 - i >= passo);
  const todos = sdrs.flatMap((s) => s.serie_evento.flatMap((p) => [p.acumulado, p.ritmo]));
  const maxY = Math.max(1, ...todos.filter((v): v is number => v !== null));
  const ponto = (i: number, v: number) => `${(fracaoX(i) * W).toFixed(1)},${(H - (v / maxY) * H).toFixed(1)}`;
  const temRitmo = sdrs.some((s) => s.serie_evento.some((p) => p.ritmo !== null));

  return (
    <article className="glass-panel flex h-full min-h-0 min-w-0 flex-col gap-4 rounded-[24px] p-5">
      <span className="text-[15px] font-semibold uppercase tracking-[0.13em] text-muted">{cabecalho}</span>

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] font-semibold text-muted" aria-label="Legenda">
        {sdrs.map((s, k) => (
          <li key={s.id_user} className="flex items-center gap-2">
            <span className="inline-block w-5 border-t-[3px]" style={{ borderColor: CORES[k % CORES.length] }} aria-hidden />
            {s.nome}
          </li>
        ))}
        {temRitmo && (
          <li className="flex items-center gap-2">
            <span className="inline-block w-5 border-t-2 border-dashed border-muted" aria-hidden /> Ritmo (pontilhada)
          </li>
        )}
      </ul>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            role="img"
            aria-label={cabecalho}
          >
            {sdrs.map((s, k) => {
              const cor = CORES[k % CORES.length];
              const real = s.serie_evento.flatMap((p, i) => (p.acumulado === null ? [] : [ponto(i, p.acumulado)]));
              const ritmo = s.serie_evento.flatMap((p, i) => (p.ritmo === null ? [] : [ponto(i, p.ritmo)]));
              return (
                <g key={s.id_user}>
                  <polyline
                    points={real.join(" ")}
                    fill="none"
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    style={{ stroke: cor }}
                    vectorEffect="non-scaling-stroke"
                    data-serie={`real:${s.nome}`}
                  />
                  {ritmo.length > 0 && (
                    <polyline
                      points={ritmo.join(" ")}
                      fill="none"
                      strokeWidth={2}
                      strokeDasharray="6 5"
                      style={{ stroke: cor }}
                      vectorEffect="non-scaling-stroke"
                      data-serie={`ritmo:${s.nome}`}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="relative mt-2 h-[19px]" data-eixo="x" aria-hidden>
          {serie.map((p, i) => (
            mostraRotulo(i) && <span
              key={p.data}
              className="absolute top-0 text-[clamp(9px,1.05vw,14px)] font-medium leading-none text-muted"
              style={{ left: `${fracaoX(i) * 100}%`, transform: i === 0 ? "none" : i === n - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
            >
              {diaMes(p.data)}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
