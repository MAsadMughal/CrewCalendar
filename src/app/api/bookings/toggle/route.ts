import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, projectId, employeeId } = body;

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
    }

    const [existingBooking] = await db.select().from(bookings)
      .where(and(
        eq(bookings.employeeId, employeeId),
        eq(bookings.date, date)
      ));

    if (existingBooking) {
      if (existingBooking.projectId === projectId) {
        await db.delete(bookings).where(eq(bookings.id, existingBooking.id));
        return NextResponse.json({ action: "deleted", booking: existingBooking });
      } else {
        return NextResponse.json({ 
          error: "Employee is already booked on another project for this date" 
        }, { status: 400 });
      }
    }

    const [booking] = await db.insert(bookings).values({
      date,
      projectId,
      employeeId,
    }).returning();

    return NextResponse.json({ action: "created", booking });
  } catch (error: any) {
    console.error("Error toggling booking:", error);
    return NextResponse.json({ error: error.message || "Failed to toggle booking" }, { status: 400 });
  }
}
