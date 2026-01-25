import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    if (email.toLowerCase() !== user.email) {
      const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (existingUser.length > 0) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        );
      }
    }

    const [updatedUser] = await db.update(users)
      .set({
        name,
        email: email.toLowerCase(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error("Update profile error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
