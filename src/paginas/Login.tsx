import { AlertTriangle, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function Login() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);

    const resultado = await entrar(email, senha);
    setEnviando(false);

    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }

    const destino = (location.state as { de?: string } | null)?.de ?? "/comercial";
    navigate(destino, { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={aoEnviar} className="w-full max-w-sm rounded-lg border border-border-2 bg-bg-2 p-6 sm:p-8">
        <h1 className="mb-6 text-lg font-semibold">Entrar</h1>

        <label className="mb-1 block text-sm font-medium" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          className="mb-4 w-full rounded-md border border-border-2 bg-bg px-3 py-2 text-sm outline-none focus:border-accent-fg"
        />

        <label className="mb-1 block text-sm font-medium" htmlFor="login-senha">
          Senha
        </label>
        <input
          id="login-senha"
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          className="mb-4 w-full rounded-md border border-border-2 bg-bg px-3 py-2 text-sm outline-none focus:border-accent-fg"
        />

        {erro && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-md border border-border-2 px-3 py-2 text-sm text-fg/70"
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-fg px-3 py-2 text-sm font-medium text-bg-2 disabled:opacity-60"
        >
          {enviando && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Entrar
        </button>
      </form>
    </div>
  );
}
