import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@shared/schema";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (authUser.role !== "admin") {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    const allUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isApproved: users.isApproved,
      emailVerified: users.emailVerified,
      lastLoginAt: users.lastLoginAt,
      loginHistory: users.loginHistory,
      createdAt: users.createdAt,
    }).from(users);

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to get users" },
      { status: 500 }
    );
  }
}
