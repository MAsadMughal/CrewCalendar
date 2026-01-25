import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@shared/schema";
import { inArray, and, eq } from "drizzle-orm";
import { isDateStringWeekend } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, dates, projectId, employeeId, bookingIds } = body;

    if (action === "create") {
      if (!dates || !Array.isArray(dates) || dates.length === 0) {
        return NextResponse.json({ error: "Dates array is required" }, { status: 400 });
      }
      if (!projectId || !employeeId) {
        return NextResponse.json({ error: "Project and employee are required" }, { status: 400 });
      }

      // Filter out weekends and validate date format (YYYY-MM-DD)
      const validDates = dates.filter((dateStr: string) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
        return !isDateStringWeekend(dateStr);
      });

      if (validDates.length === 0) {
        return NextResponse.json({ error: "No valid weekday dates provided" }, { status: 400 });
      }

      // Check for existing bookings to prevent duplicates
      const existingBookings = await db.select({ date: bookings.date })
        .from(bookings)
        .where(
          and(
            eq(bookings.employeeId, employeeId),
            eq(bookings.projectId, projectId),
            inArray(bookings.date, validDates)
          )
        );
      
      const existingDates = new Set(existingBookings.map(b => b.date));
      const newDates = validDates.filter((d: string) => !existingDates.has(d));

      if (newDates.length === 0) {
        return NextResponse.json({ success: true, count: 0, bookings: [], message: "All dates already booked" });
      }

      const bookingsToCreate = newDates.map((dateStr: string) => ({
        date: dateStr,
        projectId,
        employeeId,
      }));

      const created = await db.insert(bookings).values(bookingsToCreate).returning();
      
      return NextResponse.json({ success: true, count: created.length, bookings: created });
    }

    if (action === "delete") {
      if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
        return NextResponse.json({ error: "Booking IDs array is required" }, { status: 400 });
      }

      await db.delete(bookings).where(inArray(bookings.id, bookingIds));
      
      return NextResponse.json({ success: true, count: bookingIds.length });
    }

    return NextResponse.json({ error: "Invalid action. Use 'create' or 'delete'" }, { status: 400 });
  } catch (error: any) {
    console.error("Bulk booking error:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "Duplicate booking detected" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process bulk booking" }, { status: 500 });
  }
}
