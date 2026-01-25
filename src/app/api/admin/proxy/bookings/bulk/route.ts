import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@shared/schema";
import { inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { action, dates, projectId, employeeId, bookingIds } = body;

  if (action === "create") {
    if (!dates || !projectId || !employeeId) {
      return NextResponse.json(
        { error: "dates, projectId, and employeeId required for create" },
        { status: 400 }
      );
    }

    const weekdayDates = dates.filter((date: string) => {
      const d = new Date(date + "T12:00:00");
      const day = d.getDay();
      return day !== 0 && day !== 6;
    });

    const newBookings = [];
    for (const date of weekdayDates) {
      try {
        const [booking] = await db
          .insert(bookings)
          .values({ employeeId, projectId, date })
          .onConflictDoNothing()
          .returning();
        if (booking) newBookings.push(booking);
      } catch {
        // Ignore duplicates
      }
    }

    return NextResponse.json({ count: newBookings.length, bookings: newBookings });
  }

  if (action === "delete") {
    if (!bookingIds || !Array.isArray(bookingIds)) {
      return NextResponse.json(
        { error: "bookingIds array required for delete" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(bookings)
      .where(inArray(bookings.id, bookingIds))
      .returning();

    return NextResponse.json({ count: deleted.length });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
