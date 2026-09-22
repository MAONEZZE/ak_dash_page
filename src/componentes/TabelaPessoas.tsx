import { formatarMoeda, formatarNumero, METRICAS_EM_MOEDA } from "../lib/formato";
import { Avatar } from "./Avatar";
import type { PessoaGeral } from "../lib/tipos-api";

interface Props {
  pessoas: PessoaGeral[];
  /** Chaves `"id_user:metrica"` de células que acabaram de subir — ver lib/som.tsx. */
  destaques?: Set<string>;
}

/** Avatar da linha: menor item que ainda identifica a pessoa — é ele que dita a altura da linha. */
const AVATAR_LINHA = "clamp(24px,3vh,36px)";

/**
 * Fatia da largura que fica com a coluna da pessoa (avatar + nome); o resto se
 * divide igualmente entre as colunas de métrica. Com `table-fixed`, as duas
 * tabelas chegam à mesma grade em vez de cada uma se ajustar ao próprio
 * conteúdo — é o que mantém as 4 colunas dos SDRs alinhadas com as 4 dos
 * closers, já que os números de um cargo são mais largos que os do outro.
 */
const LARGURA_COLUNA_PESSOA_PCT = 30;

/** Colunas que mostram só o valor, sem "/ meta" (decisão de produto — Liquidado e Aprovados do closer). */
const METRICAS_SEM_META = new Set(["liquidado", "aprovados"]);

function valorTexto(v: number | null, metrica: string): string {
  if (v === null) return "—";
  return METRICAS_EM_MOEDA.has(metrica) ? formatarMoeda(v) : formatarNumero(v);
}

/**
 * Um card por cargo — verde pastel nos SDRs, azul pastel nos closers (ver
 * --painel-sdr-* / --painel-closer-* em globals.css). `flexGrow` proporcional
 * ao número de linhas: quando sobra altura na coluna, o card de 4 pessoas fica
 * com mais sobra que o de 3, e as duas tabelas mantêm o mesmo respiro por linha.
 */
function CardCargo({
  titulo,
  pessoas,
  painel,
  destaques,
}: {
  titulo: string;
  pessoas: PessoaGeral[];
  painel: string;
  destaques: Set<string>;
}) {
  if (pessoas.length === 0) return null;
  const colunas = pessoas[0].metricas;
  const larguraMetrica = `${(100 - LARGURA_COLUNA_PESSOA_PCT) / colunas.length}%`;

  return (
    <article
      className={`${painel} flex min-h-0 w-full min-w-0 flex-col gap-[clamp(2px,0.45vh,6px)] overflow-auto rounded-2xl px-[clamp(12px,1.1vw,20px)] py-[clamp(8px,1.2vh,14px)]`}
      style={{ flexGrow: pessoas.length }}
    >
      <span className="text-[clamp(13px,1.55vh,18px)] font-semibold uppercase leading-none tracking-[0.13em] text-fg/56">{titulo}</span>
      {/* `flex-1`: a sobra de altura da coluna vira respiro entre as linhas, em vez de um vão morto no pé do card. */}
      <table className="w-full flex-1 table-fixed border-collapse">
        <colgroup>
          <col style={{ width: `${LARGURA_COLUNA_PESSOA_PCT}%` }} />
          {colunas.map((c) => (
            <col key={c.metrica} style={{ width: larguraMetrica }} />
          ))}
        </colgroup>
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
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar nome={p.rotulo} imagemUrl={p.imagem_url} tamanho={AVATAR_LINHA} />
                  {/* `truncate`: a coluna agora tem largura fixa e não estica mais pro nome caber. */}
                  <span className="truncate text-[clamp(15px,1.95vh,23px)] font-semibold leading-none tracking-tight">{p.rotulo}</span>
                </div>
              </td>
              {p.metricas.map((m) => (
                <td
                  key={m.metrica}
                  className={`whitespace-nowrap px-3 py-[clamp(2px,0.42vh,5px)] font-display text-[clamp(15px,1.95vh,23px)] font-bold leading-none tracking-tight ${
                    destaques.has(`${p.id_user}:${m.metrica}`) ? "celula-subiu" : ""
                  }`}
                >
                  {valorTexto(m.realizado, m.metrica)}
                  {!METRICAS_SEM_META.has(m.metrica) && (
                    <span className="ml-1 text-[clamp(13px,1.7vh,20px)] font-semibold text-fg/45">/ {valorTexto(m.meta, m.metrica)}</span>
                  )}
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
export function TabelaPessoas({ pessoas, destaques }: Props) {
  const sdrs = pessoas.filter((p) => p.cargo === "sdr");
  const closers = pessoas.filter((p) => p.cargo === "closer");
  const destaquesEfetivos = destaques ?? new Set<string>();

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2">
      <CardCargo titulo="SDRs" pessoas={sdrs} painel="glass-panel-sdr" destaques={destaquesEfetivos} />
      <CardCargo titulo="Closers" pessoas={closers} painel="glass-panel-closer" destaques={destaquesEfetivos} />
    </div>
  );
}
