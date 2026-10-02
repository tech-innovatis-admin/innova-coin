# Innova Coin — Login central (broker / Hub)

OIDC via Hub (`openid-client`, Authorization Code + PKCE). Sessão continua no cookie HttpOnly `innova_session`.

## Fluxo

1. `GET /auth/login` → authorize no Hub
2. Callback `GET /auth/callback`
3. Resolve `user_id` / plataforma `innovacoin` nos claims centrais
4. Autorização via `getPostLoginPath` (inclui primeiro acesso)
5. Emite cookie de sessão da app com campos broker (`sid`, `authz_version`, `sub`)
6. Proxy valida sessão broker via introspection quando `AUTH_MODE` habilita SSO

## Sessão central (`hybrid` e `broker`)

O `src/proxy.ts` chama `guardRequest` (`src/lib/auth/sessionGuard.ts`) em **todas** as rotas que o matcher alcança, exceto os caminhos públicos fixos (`/`, `/login`, `/auth/login`, `/auth/logout`, `/auth/callback`, `/auth/error`) e as APIs `/api/auth/login`, `/api/auth/mode` e `/api/auth/logout`. Requisições `/api/*` passam pelo guard quando aplicável, mas **não** executam `readProxySessionUser` (sem refresh de cookie nem expiração por falha de banco). A introspection no Hub tem três resultados:

| Resultado | Página | API | Navegação cliente (RSC, prefetch, `Next-Action`) |
|---|---|---|---|
| `active` | segue | segue | segue |
| `inactive` | `303` para `/auth/login?returnTo=` e expira o cookie | `401 {"error":"session_inactive"}` | `401` sem `Location` |
| `unavailable` | `503` HTML com `Retry-After: 30` | `503 {"error":"auth_unavailable"}` | `503` |

- Timeout de 3 s; cache de até 60 s apenas para `active` e `inactive`. 401/403 da introspection contam como `inactive`; 5xx, 429, rede e timeout, como `unavailable`, sem apagar cookies.
- Em `AUTH_MODE=broker`, cookie sem campos broker (`sid`, etc.) conta como `inactive`. Em `hybrid`, sessão por senha (sem `sid`) permanece `active` só com validação de assinatura; sessão com campos broker segue introspeção.
- O cookie de sessão só é expirado quando a requisição trouxe um.
- O flag `Secure` dos cookies vem de `resolveCookieSecure` (`src/lib/auth/cookieFlags.ts`): `AUTH_COOKIE_SECURE`, depois `x-forwarded-proto`, depois `NODE_ENV=production` com host não local.
- `GET /auth/login` responde `503` com a mesma página quando a descoberta OIDC falha (timeout de 3 s); configuração ausente continua `500`.
- Erros do callback vão para `/auth/error?code=` com mensagens fixas, "Entrar novamente" e "Voltar ao Hub", e expiram apenas o cookie de transação OAuth.
- "Sair" (`/auth/logout`) expira os cookies e redireciona (`303`) para `HUB_HOME_URL`, sem encerrar a sessão do Hub. Em `legacy`, volta para `/login`.

## Feature flag

| `AUTH_MODE` | Senha | SSO Hub |
|-------------|-------|---------|
| `legacy` | sim | não |
| `hybrid` | sim | sim |
| `broker` | não | sim |

## Variáveis

- `CENTRAL_OIDC_ISSUER` (default `https://hub.innovatismc.com`)
- `CENTRAL_OIDC_CLIENT_ID` (default `innova-coin`)
- `CENTRAL_OIDC_CLIENT_SECRET` (obrigatório para SSO)
- `CENTRAL_OIDC_REDIRECT_URI` (opcional; `CENTRAL_OIDC_LOGOUT_URI` não é mais usado pelo "Sair")
- `HUB_HOME_URL` (destino do "Sair"; default `https://hub.innovatismc.com/`; só `https`, ou `http` em localhost)
- `AUTH_COOKIE_SECURE` (`true`/`false`; força o flag `Secure` dos cookies)
- `APP_URL`
- `SSO_BRIDGE_SECRET` ou `AUTH_SECRET` (cookie de transaction OAuth)

## Dev local

Porta **3002**.

```bash
AUTH_MODE=hybrid
# + CENTRAL_OIDC_CLIENT_SECRET e demais vars
npm run dev
```

Abrir `http://localhost:3002/login` → SSO quando `sso` estiver ativo em `/api/auth/mode`.

## Rollback

`AUTH_MODE=legacy` no `.env` e reiniciar.
