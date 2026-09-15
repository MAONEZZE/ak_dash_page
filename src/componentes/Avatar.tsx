interface AvatarProps {
  nome: string;
  imagemUrl?: string | null;
  /** Diâmetro em px. */
  tamanho?: number;
}

/** Foto de `imagem_url`, com fallback pra inicial num círculo — hoje o caminho comum (imagem_url é NULL pra todo mundo). */
export function Avatar({ nome, imagemUrl, tamanho = 38 }: AvatarProps) {
  if (imagemUrl) {
    return (
      <img
        src={imagemUrl}
        alt=""
        width={tamanho}
        height={tamanho}
        className="shrink-0 rounded-full border border-accent-fg/30 object-cover"
        style={{ width: tamanho, height: tamanho }}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-accent-fg/30 bg-accent-fg/10 font-display font-extrabold text-accent-fg"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.42 }}
    >
      {nome.slice(0, 1).toUpperCase()}
    </span>
  );
}
