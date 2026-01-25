import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLoginAt: user.lastLoginAt,
        loginHistory: user.loginHistory,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    );
  }
}
