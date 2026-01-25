import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, employees, holidays, bookings } from "@shared/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [allProjects, allEmployees, allHolidays, allBookings] = await Promise.all([
      db.select().from(projects)
        .where(eq(projects.userId, user.id))
        .orderBy(sql`CAST(${projects.sortOrder} AS INTEGER)`),
      
      db.select().from(employees)
        .where(eq(employees.userId, user.id)),
      
      db.select().from(holidays)
        .where(eq(holidays.userId, user.id)),
      
      db.select({
        id: bookings.id,
        date: bookings.date,
        projectId: bookings.projectId,
        employeeId: bookings.employeeId,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
      })
        .from(bookings)
        .innerJoin(projects, eq(bookings.projectId, projects.id))
        .where(eq(projects.userId, user.id)),
    ]);

    return NextResponse.json({
      projects: allProjects,
      employees: allEmployees,
      holidays: allHolidays,
      bookings: allBookings,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
