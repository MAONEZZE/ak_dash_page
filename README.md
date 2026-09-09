# ak_dash_page

Frontend do dashboard Akeel. Ver `docs/plans/dashboard-akeel.md` (no repo `Dash`) para o plano completo.

## Variáveis de ambiente (copie `.env.example` para `.env`)

- `VITE_API_BASE_URL` — URL do BFF (`ak_dash`).
- `VITE_USE_FIXTURES` — `true` serve os JSONs de `docs/contract/fixtures/` em vez de chamar o BFF (útil sem backend no ar).
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — credenciais do projeto Supabase (Settings → API no painel). **Obrigatórias para o login funcionar.** Sem elas, a tela de login aparece normalmente mas toda tentativa de entrar falha (o cliente Supabase usa um placeholder inerte em vez de quebrar o app no boot) — pendente até existir um projeto Supabase real, mesma situação do `SUPABASE_JWT_SECRET` no BFF.

## Login

Supabase Auth com email + senha (`src/lib/auth.tsx`, `src/paginas/Login.tsx`). Sem SSO, sem cadastro de usuário pelo app — pessoas são criadas direto no painel do Supabase. Sessão ativa mantém `localStorage["ak_dash_token"]` sincronizado com o token do Supabase; uma resposta 401 do BFF (sessão expirada/token inválido) força logout automático.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
