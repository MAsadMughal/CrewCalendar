import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shareLinks, projects, employees, holidays, bookings, users } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const [shareLink] = await db
      .select({
        id: shareLinks.id,
        token: shareLinks.token,
        name: shareLinks.name,
        userId: shareLinks.userId,
        expiresAt: shareLinks.expiresAt,
        createdAt: shareLinks.createdAt,
        userName: users.name,
      })
      .from(shareLinks)
      .leftJoin(users, eq(shareLinks.userId, users.id))
      .where(eq(shareLinks.token, token));

    if (!shareLink) {
      return NextResponse.json({ error: "Invalid share link" }, { status: 404 });
    }

    if (shareLink.expiresAt && new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
    }

    const userId = shareLink.userId;

    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(sql`CAST(${projects.sortOrder} AS INTEGER)`);

    const userEmployees = await db
      .select()
      .from(employees)
      .where(eq(employees.userId, userId));

    const userHolidays = await db
      .select()
      .from(holidays)
      .where(eq(holidays.userId, userId));

    const projectIds = userProjects.map(p => p.id);
    
    let userBookings: any[] = [];
    if (projectIds.length > 0) {
      userBookings = await db
        .select({
          id: bookings.id,
          date: bookings.date,
          projectId: bookings.projectId,
          employeeId: bookings.employeeId,
          createdAt: bookings.createdAt,
          updatedAt: bookings.updatedAt,
        })
        .from(bookings)
        .innerJoin(projects, eq(bookings.projectId, projects.id))
        .where(eq(projects.userId, userId));
    }

    return NextResponse.json({
      shareLink: {
        name: shareLink.name,
        userName: shareLink.userName,
        createdAt: shareLink.createdAt,
      },
      projects: userProjects,
      employees: userEmployees,
      holidays: userHolidays,
      bookings: userBookings,
    });
  } catch (error) {
    console.error("Error fetching shared calendar:", error);
    return NextResponse.json({ error: "Failed to fetch shared calendar" }, { status: 500 });
  }
}
