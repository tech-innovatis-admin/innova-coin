# Innova Coin — Cognito SSO

OIDC no App Router (Authorization Code + PKCE). Sessão continua no cookie HttpOnly `innova_session`.

## Fluxo

1. `GET /auth/login` → Hosted UI Cognito
2. Callback `GET /auth/callback`
3. Resolve `cognito_sub` / e-mail em `nexus.public.users`
4. Autorização via `innovacoin_roles` (`getPostLoginPath`)
5. Emite cookie de sessão da app (sem tokens Cognito no browser)

## Feature flag

| `AUTH_MODE` | Senha | SSO |
|-------------|-------|-----|
| `legacy` | sim | não |
| `hybrid` | sim | sim |
| `cognito` | não | sim |

## Dev local

Porta **3002** (evita conflito com Hub `:3000` e Admin `:3001`).

```bash
# após terraform apply do client innova-coin-web
node scripts/append-cognito-env.mjs
npm run dev
```

Abrir `http://localhost:3002/login` → **Entrar com SSO**.

## Rollback

`AUTH_MODE=legacy` no `.env` e reiniciar.
