interface AvatarProps {
  nome: string;
  imagemUrl?: string | null;
  /** Diâmetro: número = px; string = qualquer medida CSS (ex. `clamp(24px,3vh,36px)`), pra escalar com a altura da tela. */
  tamanho?: number | string;
}

/** Foto de `dash.users.imagem_url` (bucket `fotos_dash`), com fallback pra inicial num círculo quando a pessoa não tem foto cadastrada. */
export function Avatar({ nome, imagemUrl, tamanho = 57 }: AvatarProps) {
  const dim = typeof tamanho === "number" ? `${tamanho}px` : tamanho;

  if (imagemUrl) {
    return (
      <img
        src={imagemUrl}
        alt=""
        className="shrink-0 rounded-full border border-line object-cover"
        style={{ width: dim, height: dim }}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-line bg-ok-bg font-display font-extrabold text-brand"
      style={{ width: dim, height: dim, fontSize: `calc(${dim} * 0.42)` }}
    >
      {nome.slice(0, 1).toUpperCase()}
    </span>
  );
}
