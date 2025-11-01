import fs from "node:fs";
import path from "node:path";

export const AVATAR_FALLBACK = "/narufy_1024.png";

const warnedMissing = new Set<string>();

function normalizeAvatarPath(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function fileExists(publicPath: string): boolean {
  const absolute = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  try {
    return fs.existsSync(absolute);
  } catch {
    return false;
  }
}

function warnMissing(publicPath: string) {
  if (!warnedMissing.has(publicPath)) {
    console.warn("[avatar] not found:", publicPath);
    warnedMissing.add(publicPath);
  }
}

export function getAvatarSrc(): string {
  const envValue = normalizeAvatarPath(process.env.NEXT_PUBLIC_HOME_AVATAR);
  if (envValue) {
    if (fileExists(envValue)) {
      return envValue;
    }
    warnMissing(envValue);
  }

  if (!fileExists(AVATAR_FALLBACK)) {
    warnMissing(AVATAR_FALLBACK);
  }

  return AVATAR_FALLBACK;
}

export function getAvatarDebugInfo() {
  const envRaw = process.env.NEXT_PUBLIC_HOME_AVATAR ?? null;
  const envNormalized = normalizeAvatarPath(envRaw ?? undefined) ?? null;
  const resolved = getAvatarSrc();
  return {
    envRaw,
    envNormalized,
    fallback: AVATAR_FALLBACK,
    resolved,
  };
}
