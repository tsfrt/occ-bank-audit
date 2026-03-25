import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Demo login: accept any non-empty email + password and set a session cookie.
// In production you would validate credentials and use a proper session.
const COOKIE_NAME = "occ_analyst_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, "demo-session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
    // Store current user identifier for notifications (auditor = reviewedBy)
    const USER_COOKIE_NAME = "occ_analyst_user";
    cookieStore.set(USER_COOKIE_NAME, email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Sign-in failed. Please try again." },
      { status: 500 }
    );
  }
}
