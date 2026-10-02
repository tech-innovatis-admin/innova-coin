import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSessionTokenFromTokenUser,
  readBrokerFieldsFromToken,
  SESSION_COOKIE_NAME,
  type SessionTokenUser,
} from "@/lib/sessionToken";
import { TEST_AUTHZ_VERSION, TEST_JWT_SECRET } from "@/lib/auth/testBroker";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return {
    ...actual,
    changeUserPassword: vi.fn(),
    getSessionUser: vi.fn(),
    setSessionCookie: vi.fn(),
  };
});

import { cookies } from "next/headers";

import { changeUserPassword, getSessionUser, setSessionCookie } from "@/lib/auth";
import { POST } from "./route";

const USER: SessionTokenUser = {
  id: "42",
  platforms: ["innovacoin"],
  innovacoinRoles: ["admin"],
  mustChangePassword: false,
};

afterEach(() => {
  vi.mocked(changeUserPassword).mockReset();
  vi.mocked(getSessionUser).mockReset();
  vi.mocked(setSessionCookie).mockReset();
  delete process.env.AUTH_SECRET;
});

describe("POST /api/account/password", () => {
  it("reemite cookie preservando campos broker da sessao atual", async () => {
    process.env.AUTH_SECRET = TEST_JWT_SECRET;
    const sid = randomUUID();
    const sub = randomUUID();
    const sessionToken = await createSessionTokenFromTokenUser(USER, {
      sid,
      sub,
      authz_version: TEST_AUTHZ_VERSION,
    });

    vi.mocked(getSessionUser).mockResolvedValue({
      id: USER.id,
      email: null,
      role: "admin",
      username: null,
      name: null,
      photo: null,
      platforms: USER.platforms,
      innovacoinRoles: USER.innovacoinRoles,
      mustChangePassword: false,
    });

    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === SESSION_COOKIE_NAME ? { value: sessionToken } : undefined,
    } as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(changeUserPassword).mockResolvedValue({
      success: true,
      redirectTo: "/admin",
      user: {
        id: USER.id,
        email: null,
        role: "admin",
        username: null,
        name: null,
        photo: null,
        platforms: USER.platforms,
        innovacoinRoles: USER.innovacoinRoles,
        mustChangePassword: false,
      },
    });

    vi.mocked(setSessionCookie).mockImplementation(async (response, user, broker) => {
      const token = await createSessionTokenFromTokenUser(
        {
          id: user.id,
          platforms: user.platforms,
          innovacoinRoles: user.innovacoinRoles,
          mustChangePassword: user.mustChangePassword,
        },
        broker && typeof broker === "object" ? broker : undefined,
      );
      response.cookies.set(SESSION_COOKIE_NAME, token, { path: "/" });
    });

    const request = new Request("http://127.0.0.1:3007/api/account/password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
      },
      body: JSON.stringify({
        currentPassword: "old",
        newPassword: "new-valid-pass-1",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(setSessionCookie).toHaveBeenCalled();
    const brokerArg = vi.mocked(setSessionCookie).mock.calls[0]?.[2];
    expect(brokerArg).toEqual({
      sid,
      sub,
      authz_version: TEST_AUTHZ_VERSION,
    });

    const setCookie = response.headers.get("set-cookie") ?? "";
    const tokenMatch = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    expect(tokenMatch).not.toBeNull();
    const fields = await readBrokerFieldsFromToken(tokenMatch![1]!);
    expect(fields).toEqual({
      sid,
      sub,
      authz_version: TEST_AUTHZ_VERSION,
    });
  });
});
