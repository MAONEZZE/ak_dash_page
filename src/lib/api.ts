import comercialClosterFixture from "./fixtures/comercial_closer.example.json";
import comercialSdrFixture from "./fixtures/comercial_sdr.example.json";
import geralFixture from "./fixtures/geral.example.json";
import pessoasFixture from "./fixtures/pessoas.example.json";
import type { Erro, ParametrosComercial, ParametrosGeral, Pessoa, RespostaComercial, RespostaGeral } from "./tipos-api";

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
 * Sonda `no-cors` para separar "servidor inalcançável" de "servidor respondeu e o
 * browser barrou por CORS". Uma resposta opaca só existe se o servidor respondeu —
 * se até ela rejeita, o problema é anterior ao HTTP (DNS, TLS, rede bloqueada).
 */
async function classificarFalhaDeRede(url: string): Promise<string> {
  try {
    await fetch(url, { mode: "no-cors" });
    return "Servidor respondeu, mas o navegador bloqueou por CORS";
  } catch {
    return "Servidor inalcançável (DNS, TLS ou rede)";
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

function getToken(): string | null {
  return localStorage.getItem("ak_dash_token");
}

type ManipuladorNaoAutorizado = () => void;
let manipuladorNaoAutorizado: ManipuladorNaoAutorizado | null = null;

/** Registrado pelo AuthProvider — chamado quando o BFF responde 401 (sessão expirada/token inválido). */
export function aoNaoAutorizado(manipulador: ManipuladorNaoAutorizado): void {
  manipuladorNaoAutorizado = manipulador;
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

  const token = getToken();
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch (causa: unknown) {
    // `fetch` rejeita sem dizer por quê: DNS, TLS e CORS viram o mesmo
    // "Failed to fetch". Na TV não há devtools, então a distinção precisa
    // chegar à tela — ver docs/plans/compat-navegador-antigo.md.
    throw new RedeError(url, await classificarFalhaDeRede(url), causa);
  }

  if (!resposta.ok) {
    if (resposta.status === 401) manipuladorNaoAutorizado?.();
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
