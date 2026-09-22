/**
 * Placeholder de carregamento: o mesmo card de vidro, vazio e piscando.
 *
 * Substitui o "Carregando…" que as páginas mostravam na primeira carga (e a
 * cada troca de página, porque cada página remonta e volta ao estado inicial):
 * o texto solto trocava o layout inteiro por uma linha e a tela dava um pulo.
 * O esqueleto mantém a grade exatamente onde ela vai ficar e só sinaliza que o
 * conteúdo está a caminho.
 *
 * A cor e a piscada vivem em `.card-esqueleto` (globals.css), não no
 * `glass-panel animate-pulse` de antes: sobre o fundo de vidro da página
 * aquele tom era quase invisível e a piscada não se via.
 */
export function CardEsqueleto({ className = "" }: { className?: string }) {
  return <div className={`card-esqueleto rounded-2xl ${className}`} aria-hidden />;
}
