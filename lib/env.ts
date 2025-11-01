// lib/env.ts (backup available via version control)
import { z } from "zod";

// NEXTAUTH_URL の自動解決
export function resolveNextAuthUrl() {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL!;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// DB URL バリデータ: Postgres と SQLite を許容
function isValidDatabaseUrl(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim();
  const allowed = [
    /^postgres(?:ql)?:\/\//i, // postgres:// or postgresql://
    /^file:/i, // file:./dev.db
    /^sqlite:/i, // sqlite:...
    /^mysql:\/\//i, // future friendly
    /^planetscale:/i, // future friendly
  ];
  return allowed.some((pattern) => pattern.test(normalized));
}

const emptyToUndefined = (input: unknown) => {
  if (typeof input !== "string") return input;
  const trimmed = input.trim();
  return trimmed === "" ? undefined : trimmed;
};

const optionalString = z.preprocess(emptyToUndefined, z.string()).optional();
const optionalUrl = z
  .preprocess(emptyToUndefined, z.string())
  .pipe(z.string().url())
  .optional();
const optionalBcrypt = z
  .preprocess(emptyToUndefined, z.string())
  .pipe(
    z
      .string()
      .regex(/^\$2[aby]\$.{56}$/, "ADMIN_PASSWORD_HASH must be a valid bcrypt hash"),
  )
  .optional();

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXTAUTH_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z
      .string()
      .min(32, "NEXTAUTH_SECRET must be 32+ characters"),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .refine(isValidDatabaseUrl, {
        message:
          "DATABASE_URL must be a valid Postgres URL (例: postgres://USER:PASSWORD@HOST:5432/DB?sslmode=require) または SQLite URL (例: file:./dev.db)。",
      }),
    APP_BASE_URL: optionalUrl,
    DISCORD_WEBHOOK_URL: optionalUrl,
    NEXT_PUBLIC_HOME_AVATAR: optionalString,
    NEXT_PUBLIC_PAYPAY_LINK: optionalString,
    ADMIN_USERNAME: optionalString,
    ADMIN_PASSWORD: optionalString,
    ADMIN_PASSWORD_HASH: optionalBcrypt,
    ADMIN_BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).optional(),
  })
  .superRefine((value, ctx) => {
    const hasHash = !!value.ADMIN_PASSWORD_HASH;
    const hasCredentials = !!value.ADMIN_USERNAME && !!value.ADMIN_PASSWORD;
    if (!hasHash && !hasCredentials) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide either ADMIN_PASSWORD_HASH, or both ADMIN_USERNAME and ADMIN_PASSWORD.",
        path: ["ADMIN_PASSWORD_HASH"],
      });
    }
    if (hasHash && hasCredentials) {
      ctx.addIssue({
        code: "custom",
        message:
          "Set either ADMIN_PASSWORD_HASH OR (ADMIN_USERNAME + ADMIN_PASSWORD), not both.",
        path: ["ADMIN_PASSWORD_HASH"],
      });
    }
  });

export const Env = (() => {
  const raw = { ...process.env };
  if (!raw.NEXTAUTH_URL) raw.NEXTAUTH_URL = resolveNextAuthUrl();
  const parsed = EnvSchema.parse(raw);
  return {
    ...parsed,
    NEXTAUTH_URL: parsed.NEXTAUTH_URL ?? resolveNextAuthUrl(),
    ADMIN_BCRYPT_ROUNDS: parsed.ADMIN_BCRYPT_ROUNDS ?? 12,
  };
})();

export const {
  NODE_ENV,
  NEXTAUTH_URL,
  NEXTAUTH_SECRET,
  DATABASE_URL,
  APP_BASE_URL,
  DISCORD_WEBHOOK_URL,
  NEXT_PUBLIC_HOME_AVATAR,
  NEXT_PUBLIC_PAYPAY_LINK,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  ADMIN_PASSWORD_HASH,
  ADMIN_BCRYPT_ROUNDS,
} = Env;
