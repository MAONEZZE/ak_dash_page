import { useSearchParams } from "react-router-dom";

/** Conta escolhida no filtro, lida da querystring (`conta=Mary`). Sem filtro, null. */
export function useContaSelecionada(): string | null {
  const [params] = useSearchParams();
  return params.get("conta");
}

/**
 * Filtro de conta (perfil, etc.) com um botão "Todas" e um por conta. Mora na
 * querystring (`conta=`), como o filtro de função, e preserva os demais parâmetros.
 */
export function PillConta({ rotulo, contas }: { rotulo: string; contas: string[] }) {
  const selecionada = useContaSelecionada();
  const [params, setParams] = useSearchParams();

  function definirConta(conta: string | null) {
    const novo = new URLSearchParams(params);
    if (conta === null) novo.delete("conta");
    else novo.set("conta", conta);
    setParams(novo, { replace: true });
  }

  const opcoes: { label: string; conta: string | null }[] = [
    { label: "Todas", conta: null },
    ...contas.map((c) => ({ label: c, conta: c })),
  ];

  return (
    <div className="glass-pill flex gap-1 p-1" role="group" aria-label={rotulo}>
      {opcoes.map((o) => {
        const ativa = o.conta === selecionada;
        return (
          <button
            key={o.label}
            type="button"
            onClick={() => definirConta(o.conta)}
            aria-pressed={ativa}
            className={`pill ${ativa ? "pill-ativo" : ""}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
