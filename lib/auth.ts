import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getDbPool } from "@/lib/db";

const SESSION_COOKIE_NAME = "innova_session";
const SESSION_DURATION = "7d";
const ADMIN_ROLES = new Set(["admin", "gestor"]);

type UserRow = {
  id: string | number;
  email: string | null;
  role: string;
  username: string | null;
  name: string | null;
  photo: string | null;
  hash: string | null;
};

export type SessionUser = {
  id: string;
  email: string | null;
  role: string;
  username: string | null;
  name: string | null;
  photo: string | null;
};

type SessionPayload = JWTPayload & {
  user: SessionUser;
};

function getSessionSecret() {
  const secret =
    process.env.AUTH_SECRET || process.env.DB_PASSWORD || "change-this-secret";

  return new TextEncoder().encode(secret);
}

async function encryptSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSessionSecret());
}

async function decryptSession(token: string) {
  const { payload } = await jwtVerify(token, getSessionSecret());
  return payload as SessionPayload;
}

export function isAdminRole(role: string) {
  return ADMIN_ROLES.has(role);
}

export async function authenticateUser(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();

  if (!normalizedIdentifier || !password) {
    return null;
  }

  const pool = getDbPool();
  const result = await pool.query<UserRow>(
    `
      select id, email, role, username, name, photo, hash
      from public.users
      where lower(coalesce(email, '')) = $1
         or lower(coalesce(username, '')) = $1
      limit 1
    `,
    [normalizedIdentifier],
  );

  const user = result.rows[0];

  if (!user?.hash) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.hash);

  if (!passwordMatches) {
    return null;
  }

  return {
    id: String(user.id),
    email: user.email,
    role: user.role,
    username: user.username,
    name: user.name,
    photo: user.photo,
  } satisfies SessionUser;
}

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  const session = await encryptSession({ user });

  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await decryptSession(token);
    return payload.user ?? null;
  } catch {
    return null;
  }
}

export async function requireAuthenticatedUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireAuthenticatedUser();

  if (!isAdminRole(user.role)) {
    redirect("/dashboard");
  }

  return user;
}
