import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { WithdrawStatus } from "@/lib/heads";

type HeadOverride = {
  availableAt?: string;
  status?: WithdrawStatus;
};

type HeadOverrides = Record<string, HeadOverride>;

const headOverridesPath = path.join(process.cwd(), "data", "head-overrides.json");

async function ensureOverridesFile() {
  await mkdir(path.dirname(headOverridesPath), { recursive: true });

  try {
    await readFile(headOverridesPath, "utf8");
  } catch {
    await writeFile(headOverridesPath, "{}\n", "utf8");
  }
}

export async function readHeadOverrides() {
  await ensureOverridesFile();

  const rawContent = await readFile(headOverridesPath, "utf8");

  try {
    const parsed = JSON.parse(rawContent) as HeadOverrides;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export async function readHeadOverride(userId: string) {
  const overrides = await readHeadOverrides();
  return overrides[userId] ?? null;
}

export async function writeHeadOverride(userId: string, override: HeadOverride) {
  const overrides = await readHeadOverrides();

  overrides[userId] = {
    ...(overrides[userId] ?? {}),
    ...override,
  };

  await writeFile(headOverridesPath, `${JSON.stringify(overrides, null, 2)}\n`, "utf8");
}
