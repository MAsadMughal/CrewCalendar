import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const targetUserId = request.nextUrl.searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const userEmployees = await db
    .select()
    .from(employees)
    .where(eq(employees.userId, targetUserId));

  return NextResponse.json(userEmployees);
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, ...employeeData } = body;
  
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const [newEmployee] = await db
    .insert(employees)
    .values({
      ...employeeData,
      userId,
    })
    .returning();

  return NextResponse.json(newEmployee);
}
