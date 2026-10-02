import { describe, expect, it } from "vitest";

import {
  authErrorActions,
  authErrorMessage,
  DEFAULT_AUTH_ERROR_CODE,
} from "./authErrorCopy";

const HUB_HOME = "https://hub.example.test/";

describe("copy da pagina de erro de login", () => {
  it("cada erro de callback tem mensagem propria", () => {
    for (const code of [
      "broker_denied",
      "login_required",
      "interaction_required",
      "access_denied",
      "missing_code",
      "missing_oauth_cookie",
      "invalid_oauth_cookie",
      "state_mismatch",
      "user_not_linked",
      "callback_failed",
    ]) {
      const message = authErrorMessage(code);
      expect(message.length, code).toBeGreaterThan(0);
      expect(/sid|token|cookie=/i.test(message), code).toBe(false);
    }
  });

  it("codigo desconhecido ou ausente cai na mensagem padrao", () => {
    const fallback = authErrorMessage(DEFAULT_AUTH_ERROR_CODE);
    expect(authErrorMessage(undefined)).toBe(fallback);
    expect(authErrorMessage("inventado")).toBe(fallback);
    expect(authErrorMessage("texto%20malicioso")).toBe(fallback);
  });

  it("chaves herdadas de Object.prototype usam mensagem padrao", () => {
    const fallback = authErrorMessage(DEFAULT_AUTH_ERROR_CODE);
    for (const code of ["constructor", "__proto__", "toString"]) {
      expect(authErrorMessage(code), code).toBe(fallback);
    }
  });

  it("a pagina oferece exatamente duas acoes, sem retentativa automatica", () => {
    const actions = authErrorActions(HUB_HOME);
    expect(actions).toHaveLength(2);
    expect(actions[0]).toEqual({ label: "Entrar novamente", href: "/auth/login" });
    expect(actions[1]).toEqual({ label: "Voltar ao Hub", href: HUB_HOME });
    expect(
      actions.some((action) => /resume=1|prompt=none/.test(action.href)),
    ).toBe(false);
  });
});
