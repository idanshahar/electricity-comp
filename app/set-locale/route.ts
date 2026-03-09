import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { locale } = await request.json();
  const validLocale = ["he", "en"].includes(locale) ? locale : "he";

  const response = NextResponse.json({ ok: true });
  response.cookies.set("locale", validLocale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}
