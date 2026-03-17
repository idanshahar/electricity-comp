import { NextRequest, NextResponse } from "next/server";
import { oktaInitLogin, encryptCookiePayload, IecApiError } from "@/lib/iecApi";

export const preferredRegion = ["fra1"];

export async function POST(req: NextRequest) {
  try {
    const { israeliId } = await req.json();

    if (!israeliId || !/^\d{9}$/.test(String(israeliId))) {
      return NextResponse.json(
        { error: "Israeli ID must be exactly 9 digits" },
        { status: 400 }
      );
    }

    const { factorId, stateToken } = await oktaInitLogin(String(israeliId));

    const encrypted = await encryptCookiePayload({ factorId, stateToken, israeliId: String(israeliId) });

    const response = NextResponse.json({ ok: true });
    response.cookies.set("iec_session", encrypted, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60, // 1 hour
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    if (err instanceof IecApiError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode >= 400 && err.statusCode < 500 ? 400 : 502 });
    }
    console.error("[IEC login]", err);
    return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
  }
}
