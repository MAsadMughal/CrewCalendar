import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateResetToken } from "@/lib/auth";
import { forgotPasswordSchema } from "@shared/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset link.",
      });
    }

    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await db.update(users)
      .set({
        resetToken,
        resetTokenExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const baseUrl = process.env.APP_BASE_URL
      || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null)
      || 'http://localhost:5000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    console.log(resetUrl)
    console.log("Password reset link:", resetUrl);

    return NextResponse.json({
      message: "If an account exists with this email, you will receive a password reset link.",
      resetUrl: process.env.NODE_ENV === "development" ? resetUrl : undefined,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
