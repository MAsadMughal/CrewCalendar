import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { isApproved } = await request.json();
    const { userId } = params;

    if (typeof isApproved !== "boolean") {
      return NextResponse.json(
        { error: "isApproved must be a boolean" },
        { status: 400 }
      );
    }

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "admin") {
      return NextResponse.json(
        { error: "Cannot modify admin approval status" },
        { status: 400 }
      );
    }

    const [updatedUser] = await db
      .update(users)
      .set({ isApproved, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isApproved: updatedUser.isApproved,
      },
    });
  } catch (error) {
    console.error("Update approval error:", error);
    return NextResponse.json(
      { error: "Failed to update approval status" },
      { status: 500 }
    );
  }
}
