import "server-only";
import { NextResponse } from "next/server";

export async function GET() {
  const username = (process.env.ADMIN_USERNAME ?? "").trim();
  const hash = (process.env.ADMIN_PASSWORD_HASH ?? "").trim();

  return NextResponse.json({
    hasUsername: username.length > 0,
    hasPasswordHash: hash.length > 0,
    hashLength: hash.length,
  });
}
