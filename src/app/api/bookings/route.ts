import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, projects } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";
import { bookingSchema } from "@shared/validations";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const allBookings = await db.select({
      id: bookings.id,
      date: bookings.date,
      projectId: bookings.projectId,
      employeeId: bookings.employeeId,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
    })
      .from(bookings)
      .innerJoin(projects, eq(bookings.projectId, projects.id))
      .where(eq(projects.userId, user.id));
    
    return NextResponse.json(allBookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validated = bookingSchema.parse(body);

    const [booking] = await db.insert(bookings).values(validated).returning();

    return NextResponse.json(booking);
  } catch (error: any) {
    console.error("Error creating booking:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "Employee already booked on this date" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create booking" }, { status: 400 });
  }
}
