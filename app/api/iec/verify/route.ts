import { NextRequest, NextResponse } from "next/server";
import {
  oktaVerifyOtp,
  oktaPkceExchange,
  encryptCookiePayload,
  decryptCookiePayload,
  IecApiError,
} from "@/lib/iecApi";

export const preferredRegion = ["fra1"];

interface SessionInit {
  factorId: string;
  stateToken: string;
  israeliId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { otpCode } = await req.json();

    if (!otpCode || !/^\d{4,8}$/.test(String(otpCode).trim())) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    const sessionCookie = req.cookies.get("iec_session")?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Session expired. Please start again." },
        { status: 401 }
      );
    }

    const { factorId, stateToken, israeliId } = await decryptCookiePayload<SessionInit>(sessionCookie);

    // Verify OTP → sessionToken
    const sessionToken = await oktaVerifyOtp(factorId, stateToken, String(otpCode).trim());

    // PKCE exchange → id_token + access_token
    const { idToken, accessToken } = await oktaPkceExchange(sessionToken);

    // Store tokens + israeliId in cookie (replacing init session)
    const encrypted = await encryptCookiePayload({ idToken, accessToken, israeliId });

    const response = NextResponse.json({ ok: true });
    response.cookies.set("iec_session", encrypted, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    if (err instanceof IecApiError) {
      const isClientError = err.statusCode >= 400 && err.statusCode < 500;
      return NextResponse.json(
        { error: err.message },
        { status: isClientError ? 400 : 502 }
      );
    }
    console.error("[IEC verify]", err);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
