import { formatarNumero } from "../lib/formato";

/** A largura do trilho da barra é 120% da meta. */
const TETO_DA_BARRA = 1.2;
const CORES_MEDALHA = ["var(--color-ouro)", "var(--color-prata)", "var(--color-bronze)"];
const CINZA_MARCADOR = "var(--color-faint)";
const VERDE_ESCURO = "var(--color-ok-claro)"; // acumulado do mês
const VERDE_CLARO = "var(--color-accent)"; // inscrições de hoje

export interface ItemRanking {
  id: string;
  nome: string;
  valor: number;
  valorHoje: number;
  meta: number | null;
  negocios?: number;
}

/**
 * Dias seg–sex decorridos da janela em `agora`, com o dia de hoje fracionado pela hora; `total` = dias seg–sex da janela.
 */
export function diasUteisDecorridos(inicio: string, fim: string, agora: Date): { decorridos: number; total: number } {
  const [ai, mi, di] = inicio.split("-").map(Number);
  const [af, mf, df] = fim.split("-").map(Number);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const ultimo = new Date(af, mf - 1, df);
  let total = 0;
  let decorridos = 0;
  for (let dia = new Date(ai, mi - 1, di); dia <= ultimo; dia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1)) {
    const diaSemana = dia.getDay();
    if (diaSemana === 0 || diaSemana === 6) continue;
    total++;
    if (dia < hoje) decorridos++;
    else if (dia.getTime() === hoje.getTime()) decorridos += (agora.getTime() - hoje.getTime()) / 86_400_000;
  }
  return { decorridos, total };
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
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
        <Medalha cor={CORES_MEDALHA[posicao - 1]} tamanho={52} />
      </span>
    );
  }
  return (
    <span data-posicao={`${posicao}º`} className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-track text-[24px] font-semibold text-muted">
      {posicao}º
    </span>
  );
}

function Bolinha({ cor }: { cor: string }) {
  return <span className="inline-block h-4 w-4 rounded-full" style={{ background: cor }} />;
}

const MARCADORES = [
  { fracao: 0.7, rotulo: "70% da meta", cor: CORES_MEDALHA[2], trofeu: false },
  { fracao: 1, rotulo: "100% da meta", cor: CORES_MEDALHA[0], trofeu: false },
  { fracao: TETO_DA_BARRA, rotulo: "120% da meta", cor: CORES_MEDALHA[0], trofeu: true },
];

function LinhaRanking({
  item,
  posicao,
  decorridos,
  total,
  unidade,
}: {
  item: ItemRanking;
  posicao: number;
  decorridos: number;
  total: number;
  unidade: { singular: string; plural: string };
}) {
  const { valor, valorHoje, meta, negocios } = item;
  const metaValida = meta !== null && meta > 0 ? meta : null;
  const escala = metaValida !== null ? metaValida * TETO_DA_BARRA : 0;
  // Largura sobre meta × 1,2, cortada no fim do trilho.
  const largura = (v: number) => (escala > 0 ? `${(Math.min(v, escala) / escala) * 100}%` : "0%");
  const projecao = decorridos > 0 ? Math.round((valor / decorridos) * total) : valor;
  const pctProjecao = metaValida !== null ? Math.round((projecao / metaValida) * 100) : null;
  const ritmo = total > 0 ? (decorridos / total / TETO_DA_BARRA) * 100 : 0;

  return (
    <li data-item={item.id} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Posicao posicao={posicao} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[36px] font-medium leading-tight">{item.nome}</span>
            {negocios !== undefined && (
              <span data-negocios className="text-[26px] text-muted">
                {formatarNumero(negocios)} {negocios === 1 ? "negócio" : "negócios"}
              </span>
            )}
          </div>
        </div>
        <div data-numeros className="flex shrink-0 items-baseline gap-2">
          {valorHoje > 0 && (
            <span data-hoje className="text-[32px] font-semibold text-ok">+{formatarNumero(valorHoje)} hoje</span>
          )}
          <span data-total className="text-[44px] font-bold text-fogo">{formatarNumero(valor)}</span>
          <span className="text-[28px] text-faint">/ {metaValida !== null ? formatarNumero(metaValida) : "—"}</span>
          {metaValida !== null && (
            <span data-pct className="text-[28px] font-bold">{Math.round((valor / metaValida) * 100)}%</span>
          )}
        </div>
      </div>

      <div className="relative pt-12">
        {metaValida !== null &&
          MARCADORES.map((m) => {
            const atingido = valor >= metaValida * m.fracao;
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
                {m.trofeu ? <Trofeu cor={cor} tamanho={40} /> : <Medalha cor={cor} tamanho={40} />}
              </span>
            );
          })}
        <div
          className="relative h-2 overflow-hidden rounded-full bg-track"
          role="progressbar"
          aria-label={`${capitalizar(unidade.plural)} de ${item.nome}`}
          aria-valuenow={valor}
          aria-valuemin={0}
          aria-valuemax={metaValida ?? undefined}
        >
          {/* Sobrepostas, as duas a partir do início: o acumulado do mês atrás, o dia na frente. */}
          <span data-segmento="acumulado" className="absolute inset-y-0 left-0" style={{ width: largura(valor), background: VERDE_ESCURO }} />
          <span data-segmento="hoje" className="absolute inset-y-0 left-0" style={{ width: largura(valorHoje), background: VERDE_CLARO }} />
          <span data-ritmo className="absolute inset-y-0 w-px bg-muted" style={{ left: `${ritmo}%` }} />
        </div>
      </div>

      <p data-run-rate className="text-[26px] text-muted">
        Run rate · previsão de fechamento:{" "}
        <span className={`font-semibold ${pctProjecao !== null && pctProjecao >= 100 ? "text-ok" : "text-fogo"}`}>
          {formatarNumero(projecao)} {projecao === 1 ? unidade.singular : unidade.plural}
          {pctProjecao !== null && ` (${pctProjecao}% da meta)`}
        </span>
      </p>
    </li>
  );
}

/**
 * Card de ranking contra a meta: valor acumulado da janela por pessoa, com o dia em verde claro; usado nas
 * páginas SDR e Seller. Embaixo do nome, os negócios de cada item quando informados. O `badge` é um
 * total opcional no cabeçalho. Ordena por valor, decrescente, desempatando por negócios.
 */
export function RankingMeta({
  titulo,
  rotuloLista,
  itens,
  janela,
  unidade,
  legendaHoje,
  badge = null,
  vazio,
  agora = new Date(),
}: {
  titulo: string;
  rotuloLista: string;
  itens: ItemRanking[];
  janela: { inicio: string; fim: string } | null;
  unidade: { singular: string; plural: string };
  legendaHoje: string;
  badge?: string | null;
  vazio: string;
  agora?: Date;
}) {
  const ordenados = [...itens].sort((a, b) => b.valor - a.valor || (b.negocios ?? 0) - (a.negocios ?? 0));
  const metaDoMes = ordenados.reduce((soma, i) => soma + (i.meta ?? 0), 0);
  const { decorridos, total } = janela ? diasUteisDecorridos(janela.inicio, janela.fim, agora) : { decorridos: 0, total: 0 };
  const rotuloMeta = janela ? `Meta até ${janela.fim.slice(8, 10)}/${janela.fim.slice(5, 7)}:` : "Meta:";

  return (
    <article
      className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto rounded-[16px] bg-surface p-6 shadow-sm"
      aria-label={titulo}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Trofeu cor="var(--color-fogo)" tamanho={44} />
          <h2 className="text-[40px] font-semibold">{titulo}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[24px] text-muted">
          <span>
            {rotuloMeta} <strong>{formatarNumero(metaDoMes)}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex items-center gap-1"><Bolinha cor={VERDE_ESCURO} /> Acumulado do mês</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Bolinha cor={VERDE_CLARO} /> {legendaHoje}</span>
          </span>
          {badge !== null && (
            <span data-total-geral className="rounded-full bg-track px-2.5 py-0.5 font-bold">
              {badge}
            </span>
          )}
        </div>
      </header>
      {ordenados.length === 0 ? (
        <p className="text-[28px] text-muted">{vazio}</p>
      ) : (
        <ol aria-label={rotuloLista} className="flex flex-col gap-4">
          {ordenados.map((item, i) => (
            <LinhaRanking key={item.id} item={item} posicao={i + 1} decorridos={decorridos} total={total} unidade={unidade} />
          ))}
        </ol>
      )}
    </article>
  );
}
