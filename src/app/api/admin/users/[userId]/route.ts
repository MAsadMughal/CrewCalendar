import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, projects, employees, holidays, bookings } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authUser = await getAuthUser();
    
    if (!authUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (authUser.role !== "admin") {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    const { userId } = await params;

    const [targetUser] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      lastLoginAt: users.lastLoginAt,
      loginHistory: users.loginHistory,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId));

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userProjects = await db.select().from(projects).where(eq(projects.userId, userId));
    const userEmployees = await db.select().from(employees).where(eq(employees.userId, userId));
    const userHolidays = await db.select().from(holidays).where(eq(holidays.userId, userId));
    
    const projectIds = userProjects.map(p => p.id);
    const userBookings = projectIds.length > 0 
      ? await db.select().from(bookings).where(inArray(bookings.projectId, projectIds))
      : [];

    return NextResponse.json({
      user: targetUser,
      projects: userProjects,
      employees: userEmployees,
      holidays: userHolidays,
      bookings: userBookings,
    });
  } catch (error) {
    console.error("Get user data error:", error);
    return NextResponse.json(
      { error: "Failed to get user data" },
      { status: 500 }
    );
  }
}
