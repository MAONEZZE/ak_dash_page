/**
 * Único lugar que toca em Web Audio — isolado do resto justamente pra ser
 * mockado nos testes (jsdom não tem `AudioContext`). Ver
 * docs/plans/som-agendamento-nathan-jennifer.md.
 */

export type PerfilSom = "nathan" | "jennifer";

/** Duas notas por plin, uma oitava acima pra Jennifer — mesmo gesto sonoro, altura diferente. */
const NOTAS: Record<PerfilSom, [number, number]> = {
  nathan: [587.33, 783.99], // D5 -> G5
  jennifer: [1174.66, 1567.98], // D6 -> G6
};

const DURACAO_NOTA_S = 0.09;

let contexto: AudioContext | null = null;

function obterOuCriarContexto(): AudioContext | null {
  if (typeof AudioContext === "undefined") return null;
  if (!contexto) contexto = new AudioContext();
  return contexto;
}

/** Chamado no clique do botão de som — gesto do usuário exigido pelos navegadores pra permitir áudio. */
export async function liberar(): Promise<boolean> {
  const ctx = obterOuCriarContexto();
  if (!ctx) return false;
  await ctx.resume();
  return ctx.state === "running";
}

export function estaLiberado(): boolean {
  return contexto?.state === "running";
}

function tocarNota(ctx: AudioContext, frequencia: number, inicio: number): void {
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequencia;
  // Envelope de ganho pra não estalar no início/fim da nota.
  ganho.gain.setValueAtTime(0, inicio);
  ganho.gain.linearRampToValueAtTime(0.3, inicio + 0.01);
  ganho.gain.linearRampToValueAtTime(0, inicio + DURACAO_NOTA_S);
  osc.connect(ganho);
  ganho.connect(ctx.destination);
  osc.start(inicio);
  osc.stop(inicio + DURACAO_NOTA_S);
}

/** No-op silencioso se o contexto não existe ou ainda não foi liberado pelo navegador. */
export function plin(perfil: PerfilSom): void {
  const ctx = contexto;
  if (!ctx || ctx.state !== "running") return;
  const [n1, n2] = NOTAS[perfil];
  const agora = ctx.currentTime;
  tocarNota(ctx, n1, agora);
  tocarNota(ctx, n2, agora + DURACAO_NOTA_S);
}

export type SomDeEvento = "inscrito" | "aprovado";

const ARQUIVOS: Record<SomDeEvento, string> = {
  inscrito: "/sons/inscrito.wav",
  aprovado: "/sons/aprovado.wav",
};

/**
 * Inscritos/Aprovados não usam o plin sintetizado: são arquivos gravados em
 * `public/sons`. Um `Audio` novo por disparo pra dois sons poderem se
 * sobrepor. Mesmo portão do plin — enquanto o usuário não liberou o áudio no
 * botão de som, o navegador bloquearia o play de qualquer jeito.
 */
export function tocarArquivo(nome: SomDeEvento): void {
  if (!estaLiberado()) return;
  // `play()` rejeita se o navegador ainda barrar o áudio — som não é motivo
  // pra estourar erro não tratado no dashboard.
  void new Audio(ARQUIVOS[nome]).play().catch(() => {});
}
