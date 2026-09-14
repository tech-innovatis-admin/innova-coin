# Innova Coin — Login central (broker / Hub)

OIDC via Hub (`openid-client`, Authorization Code + PKCE). Sessão continua no cookie HttpOnly `innova_session`.

## Fluxo

1. `GET /auth/login` → authorize no Hub
2. Callback `GET /auth/callback`
3. Resolve `user_id` / plataforma `innovacoin` nos claims centrais
4. Autorização via `getPostLoginPath` (inclui primeiro acesso)
5. Emite cookie de sessão da app com campos broker (`sid`, `authz_version`, `sub`)
6. Proxy valida sessão broker via introspection quando `AUTH_MODE` habilita SSO

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
- `CENTRAL_OIDC_REDIRECT_URI` / `CENTRAL_OIDC_LOGOUT_URI` (opcionais)
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
