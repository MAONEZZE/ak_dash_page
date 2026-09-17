interface AvatarProps {
  nome: string;
  imagemUrl?: string | null;
  /** Diâmetro: número = px; string = qualquer medida CSS (ex. `clamp(24px,3vh,36px)`), pra escalar com a altura da tela. */
  tamanho?: number | string;
}

/** Foto de `imagem_url`, com fallback pra inicial num círculo — hoje o caminho comum (imagem_url é NULL pra todo mundo). */
export function Avatar({ nome, imagemUrl, tamanho = 57 }: AvatarProps) {
  const dim = typeof tamanho === "number" ? `${tamanho}px` : tamanho;

  if (imagemUrl) {
    return (
      <img
        src={imagemUrl}
        alt=""
        className="shrink-0 rounded-full border border-accent-fg/30 object-cover"
        style={{ width: dim, height: dim }}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-accent-fg/30 bg-accent-fg/10 font-display font-extrabold text-accent-fg"
      style={{ width: dim, height: dim, fontSize: `calc(${dim} * 0.42)` }}
    >
      {nome.slice(0, 1).toUpperCase()}
    </span>
  );
}
