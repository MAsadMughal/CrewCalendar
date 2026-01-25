import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, projects } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
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

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, targetUserId));

  if (userProjects.length === 0) {
    return NextResponse.json([]);
  }

  const userBookings = await db
    .select()
    .from(bookings)
    .where(inArray(bookings.projectId, userProjects.map((p) => p.id)));

  return NextResponse.json(userBookings);
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { employeeId, projectId, date } = body;
  
  if (!employeeId || !projectId || !date) {
    return NextResponse.json({ error: "employeeId, projectId, and date required" }, { status: 400 });
  }

  const [newBooking] = await db
    .insert(bookings)
    .values({ employeeId, projectId, date })
    .returning();

  return NextResponse.json(newBooking);
}
