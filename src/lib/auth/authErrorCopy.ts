export type AuthErrorAction = {
  label: string;
  href: string;
};

export const DEFAULT_AUTH_ERROR_CODE = "callback_failed";

const MESSAGES: Record<string, string> = {
  broker_denied: "O login foi cancelado ou negado no Hub Innovatis.",
  cognito_denied: "O login foi cancelado ou negado no Cognito.",
  login_required: "Sua sessão no Hub expirou. Entre novamente para continuar.",
  interaction_required: "O Hub precisa de uma nova confirmação de login.",
  access_denied: "O acesso foi negado no Hub Innovatis.",
  missing_code: "A resposta do login veio incompleta.",
  missing_oauth_cookie: "A tentativa de login expirou antes de terminar.",
  invalid_oauth_cookie: "A tentativa de login ficou inválida.",
  state_mismatch: "A validação de segurança do login não conferiu.",
  platform_forbidden: "Você entrou, mas não tem acesso à plataforma Innova Coin.",
  user_not_linked: "Você entrou, mas não tem acesso à plataforma Innova Coin.",
  [DEFAULT_AUTH_ERROR_CODE]: "Não foi possível concluir o login.",
};

export function authErrorMessage(code: string | undefined): string {
  if (code === undefined || !Object.hasOwn(MESSAGES, code)) {
    return MESSAGES[DEFAULT_AUTH_ERROR_CODE];
  }
  return MESSAGES[code];
}

export function authErrorActions(hubHome: string): AuthErrorAction[] {
  return [
    { label: "Entrar novamente", href: "/auth/login" },
    { label: "Voltar ao Hub", href: hubHome },
  ];
}
