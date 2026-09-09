import comercialClosterFixture from "./fixtures/comercial_closer.example.json";
import comercialSdrFixture from "./fixtures/comercial_sdr.example.json";
import pessoasFixture from "./fixtures/pessoas.example.json";
import type { Erro, ParametrosComercial, Pessoa, RespostaComercial } from "./tipos-api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const USA_FIXTURES = import.meta.env.VITE_USE_FIXTURES === "true";

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
  const resposta = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!resposta.ok) {
    if (resposta.status === 401) manipuladorNaoAutorizado?.();
    const corpo = (await resposta.json().catch(() => null)) as Erro | null;
    throw new ApiError(
      resposta.status,
      corpo?.erro ?? { codigo: "erro_desconhecido", mensagem: `Falha ao consultar ${caminho}` },
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
