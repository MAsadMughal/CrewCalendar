import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@shared/validations";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const rateLimitKey = `login:${ip}:${email}`;
    const rateCheck = checkRateLimit(rateLimitKey);

    if (!rateCheck.allowed) {
      const minutesRemaining = Math.ceil(rateCheck.resetInMs / 60000);
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${minutesRemaining} minutes.` },
        { status: 429 }
      );
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const now = new Date();
    if (user.lockoutUntil && user.lockoutUntil > now) {
      const minutesRemaining = Math.ceil((user.lockoutUntil.getTime() - now.getTime()) / 60000);
      return NextResponse.json(
        { error: `Account locked. Please try again in ${minutesRemaining} minutes.` },
        { status: 423 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const lockoutUntil = failedAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
        : null;

      await db.update(users)
        .set({
          failedLoginAttempts: failedAttempts,
          lockoutUntil,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));

      if (lockoutUntil) {
        return NextResponse.json(
          { error: "Too many failed attempts. Account locked for 15 minutes." },
          { status: 423 }
        );
      }

      const remainingAttempts = MAX_FAILED_ATTEMPTS - failedAttempts;
      return NextResponse.json(
        { error: `Invalid email or password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.` },
        { status: 401 }
      );
    }

    if (!user.emailVerified && user.role !== "admin") {
      return NextResponse.json(
        { error: "Please verify your email address before logging in. Check your inbox for the verification link." },
        { status: 403 }
      );
    }

    if (!user.isApproved && user.role !== "admin") {
      return NextResponse.json(
        { error: "Your account is pending approval. Please contact the administrator." },
        { status: 403 }
      );
    }

    resetRateLimit(rateLimitKey);

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const loginHistory = (user.loginHistory || [])
      .filter((date) => date && date > thirtyDaysAgo)
      .slice(0, 29);
    loginHistory.unshift(now);

    await db.update(users)
      .set({
        lastLoginAt: now,
        loginHistory,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
