import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, verifyPassword, hashPassword } from "@/lib/auth";
import { changePasswordSchema } from "@shared/validations";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    if (!user.password) {
      return NextResponse.json(
        { error: "Cannot change password for this account" },
        { status: 400 }
      );
    }

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to change password" },
      { status: 500 }
    );
  }
}
