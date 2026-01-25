import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holidays, bookings } from "@shared/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { holidaySchema } from "@shared/validations";
import { getWeekdayStringsBetween } from "@/lib/utils";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const allHolidays = await db.select().from(holidays)
      .where(eq(holidays.userId, user.id))
      .orderBy(asc(holidays.date));
    
    return NextResponse.json(allHolidays);
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const validated = holidaySchema.parse(body);

    const { name, startDate, endDate } = validated;
    
    const dateStrings = getWeekdayStringsBetween(startDate, endDate || startDate);
    
    const createdHolidays = [];
    for (const dateStr of dateStrings) {
      const [holiday] = await db.insert(holidays).values({
        name,
        date: dateStr,
        userId: user.id,
      }).returning();
      createdHolidays.push(holiday);
    }

    if (dateStrings.length > 0) {
      await db.delete(bookings).where(
        inArray(bookings.date, dateStrings)
      );
    }

    return NextResponse.json(createdHolidays);
  } catch (error: any) {
    console.error("Error creating holiday:", error);
    return NextResponse.json({ error: error.message || "Failed to create holiday" }, { status: 400 });
  }
}
