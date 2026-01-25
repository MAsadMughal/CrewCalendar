import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { resetPasswordSchema } from "@shared/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    
    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    if (user.resetTokenExpiry && user.resetTokenExpiry < new Date()) {
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await db.update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    const authToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await setAuthCookie(authToken);

    return NextResponse.json({
      message: "Password has been reset successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
