import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holidays, bookings, projects } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
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

  const userHolidays = await db
    .select()
    .from(holidays)
    .where(eq(holidays.userId, targetUserId));

  return NextResponse.json(userHolidays);
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, ...holidayData } = body;
  
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const [newHoliday] = await db
    .insert(holidays)
    .values({
      ...holidayData,
      userId,
    })
    .returning();

  if (holidayData.date) {
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId));
    
    if (userProjects.length > 0) {
      await db
        .delete(bookings)
        .where(
          and(
            eq(bookings.date, holidayData.date),
            inArray(bookings.projectId, userProjects.map((p) => p.id))
          )
        );
    }
  }

  return NextResponse.json(newHoliday);
}
