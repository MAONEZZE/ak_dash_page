import comercialClosterFixture from "./fixtures/comercial_closer.example.json";
import comercialSdrFixture from "./fixtures/comercial_sdr.example.json";
import financeiroFixture from "./fixtures/financeiro.example.json";
import geralFixture from "./fixtures/geral.example.json";
import pessoasFixture from "./fixtures/pessoas.example.json";
import type {
  Erro,
  ParametrosComercial,
  ParametrosGeral,
  Pessoa,
  RespostaComercial,
  RespostaFinanceiro,
  RespostaGeral,
} from "./tipos-api";
import { supabase } from "./supabase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const USA_FIXTURES = import.meta.env.VITE_USE_FIXTURES === "true";

export class RedeError extends Error {
  url: string;

  constructor(url: string, motivo: string, causa: unknown) {
    const bruto = causa instanceof Error ? `${causa.name}: ${causa.message}` : String(causa);
    super(`${motivo} · ${url} · ${bruto}`);
    this.url = url;
  }
}

/**
 * Separa as três causas que o `fetch` funde num único "Failed to fetch".
 *
 * Sonda 1 (`no-cors`): resposta opaca só existe se o servidor respondeu — se
 * até ela rejeita, o problema é anterior ao HTTP (DNS, TLS, rede bloqueada).
 *
 * Sonda 2 (`cors`, sem header nenhum): GET sem header custom é *requisição
 * simples* e não dispara preflight. Se ela passa e a real (com `Authorization`)
 * não, então a origem está liberada e o que quebrou foi o `OPTIONS` — que morre
 * antes do FastAPI, no proxy/CDN na frente dele. Se ela também falha, a origem
 * desta página não está em `CORS_ORIGINS`.
 *
 * A origem entra na mensagem porque é o dado que falta: a TV pode estar abrindo
 * o dashboard por um host diferente do que se usa no desktop (workers.dev vs.
 * domínio próprio, `www.`, ou `http://` sem o upgrade que o HSTS dá no desktop).
 */
async function classificarFalhaDeRede(url: string): Promise<string> {
  const origem = window.location.origin;

  try {
    await fetch(url, { mode: "no-cors" });
  } catch {
    return `Servidor inalcançável (DNS, TLS ou rede) · origem ${origem}`;
  }

  try {
    await fetch(url, { mode: "cors" });
    return `Preflight OPTIONS barrado antes do backend (origem ${origem} está liberada)`;
  } catch {
    return `Origem ${origem} não está em CORS_ORIGINS do backend`;
  }
}

export class ApiError extends Error {
  codigo: string;
  status: number;

  constructor(status: number, erro: Erro["erro"]) {
    super(erro.mensagem);
    this.codigo = erro.codigo;
    this.status = status;
  }
}

/**
 * Token pedido ao supabase-js na hora da requisição — nunca uma cópia guardada.
 *
 * Havia aqui um `localStorage.getItem("ak_dash_token")`, espelho que o
 * AuthProvider atualizava a cada `onAuthStateChange`. O espelho envelhecia: o
 * access token vence (1h por padrão) e o auto-refresh do supabase-js roda no
 * seu próprio relógio, então bastava a busca automática (a cada 60s, ver
 * `INTERVALO_AUTO_REFRESH_MS`) cair na janela entre o vencimento e o refresh
 * pra mandar um token vencido ao BFF. `getSession()` fecha essa janela: ele
 * renova o token antes de devolver quando já está vencido.
 */
async function obterToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function requisitar<T>(caminho: string, params?: Record<string, string | string[] | undefined>): Promise<T> {
  const query = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor === undefined) continue;
    if (Array.isArray(valor)) {
      for (const item of valor) query.append(chave, item);
    } else {
      query.append(chave, valor);
    }
  }
  const queryString = query.toString();
  const url = `${BASE_URL}${caminho}${queryString ? `?${queryString}` : ""}`;

  async function enviar(): Promise<Response> {
    const token = await obterToken();
    try {
      return await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch (causa: unknown) {
      // `fetch` rejeita sem dizer por quê: DNS, TLS e CORS viram o mesmo
      // "Failed to fetch". Na TV não há devtools, então a distinção precisa
      // chegar à tela — ver docs/plans/compat-navegador-antigo.md.
      throw new RedeError(url, await classificarFalhaDeRede(url), causa);
    }
  }

  let resposta = await enviar();

  // 401 NÃO derruba a sessão. Antes derrubava (um `signOut()` no primeiro 401),
  // e era isso que fazia a TV amanhecer na tela de login: qualquer 401 — token
  // vencido por segundos, BFF reiniciando, JWKS momentaneamente fora do ar —
  // matava uma sessão que continuava perfeitamente válida.
  //
  // Agora tenta renovar UMA vez e repetir. Se o refresh trouxe sessão nova e o
  // BFF ainda assim recusa, o problema é do BFF, não da sessão: vira erro na
  // tela (a página tenta de novo em 60s) em vez de logout. Quem decide que a
  // sessão acabou de verdade é o supabase-js, que emite `SIGNED_OUT` quando o
  // refresh token é revogado — o AuthProvider escuta esse evento.
  if (resposta.status === 401) {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) resposta = await enviar();
  }

  if (!resposta.ok) {
    const corpo = (await resposta.json().catch(() => null)) as Erro | null;
    throw new ApiError(
      resposta.status,
      corpo?.erro ?? { codigo: "erro_desconhecido", mensagem: `Falha ao consultar ${caminho} (HTTP ${resposta.status})` },
    );
  }

  return resposta.json() as Promise<T>;
}

export async function buscarPessoas(): Promise<Pessoa[]> {
  if (USA_FIXTURES) return pessoasFixture as Pessoa[];
  return requisitar<Pessoa[]>("/pessoas");
}

export async function buscarComercialSdr(params: ParametrosComercial): Promise<RespostaComercial> {
  if (USA_FIXTURES) return comercialSdrFixture as RespostaComercial;
  return requisitar<RespostaComercial>("/comercial/sdr", {
    granularidade: params.granularidade,
    periodo: params.periodo,
    pessoas: params.pessoas,
  });
}

export async function buscarComercialCloser(params: ParametrosComercial): Promise<RespostaComercial> {
  if (USA_FIXTURES) return comercialClosterFixture as RespostaComercial;
  return requisitar<RespostaComercial>("/comercial/closer", {
    granularidade: params.granularidade,
    periodo: params.periodo,
    pessoas: params.pessoas,
  });
}

export async function buscarGeral(params: ParametrosGeral = {}): Promise<RespostaGeral> {
  if (USA_FIXTURES) return geralFixture as RespostaGeral;
  return requisitar<RespostaGeral>("/geral", { granularidade: params.granularidade, periodo: params.periodo });
}

export async function buscarFinanceiro(params: ParametrosGeral = {}): Promise<RespostaFinanceiro> {
  if (USA_FIXTURES) return financeiroFixture as RespostaFinanceiro;
  return requisitar<RespostaFinanceiro>("/financeiro", { granularidade: params.granularidade, periodo: params.periodo });
}
