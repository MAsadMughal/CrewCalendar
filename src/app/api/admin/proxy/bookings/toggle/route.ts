import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { employeeId, projectId, date } = await request.json();
  
  if (!employeeId || !projectId || !date) {
    return NextResponse.json(
      { error: "employeeId, projectId, and date required" },
      { status: 400 }
    );
  }

  const existing = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.employeeId, employeeId),
        eq(bookings.projectId, projectId),
        eq(bookings.date, date)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db.delete(bookings).where(eq(bookings.id, existing[0].id));
    return NextResponse.json({ action: "deleted", booking: existing[0] });
  } else {
    const [newBooking] = await db
      .insert(bookings)
      .values({ employeeId, projectId, date })
      .returning();
    return NextResponse.json({ action: "created", booking: newBooking });
  }
}
