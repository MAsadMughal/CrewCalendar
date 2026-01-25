import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, employees, holidays, bookings, users } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

interface PendingChange {
  type: "create" | "update" | "delete";
  entity: "project" | "employee" | "holiday" | "booking";
  id?: string;
  data?: Record<string, unknown>;
}

export async function POST(
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

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const changes: PendingChange[] = body.changes || [];

    if (changes.length === 0) {
      return NextResponse.json({ message: "No changes to save" });
    }

    for (const change of changes) {
      switch (change.entity) {
        case "project":
          if (change.type === "create" && change.data) {
            await db.insert(projects).values({
              ...change.data,
              userId,
            } as typeof projects.$inferInsert);
          } else if (change.type === "update" && change.id && change.data) {
            await db.update(projects)
              .set({ ...change.data, updatedAt: new Date() })
              .where(and(eq(projects.id, change.id), eq(projects.userId, userId)));
          } else if (change.type === "delete" && change.id) {
            await db.delete(bookings).where(eq(bookings.projectId, change.id));
            await db.delete(projects).where(and(eq(projects.id, change.id), eq(projects.userId, userId)));
          }
          break;

        case "employee":
          if (change.type === "create" && change.data) {
            await db.insert(employees).values({
              ...change.data,
              userId,
            } as typeof employees.$inferInsert);
          } else if (change.type === "update" && change.id && change.data) {
            await db.update(employees)
              .set({ ...change.data, updatedAt: new Date() })
              .where(and(eq(employees.id, change.id), eq(employees.userId, userId)));
          } else if (change.type === "delete" && change.id) {
            await db.delete(bookings).where(eq(bookings.employeeId, change.id));
            await db.delete(employees).where(and(eq(employees.id, change.id), eq(employees.userId, userId)));
          }
          break;

        case "holiday":
          if (change.type === "create" && change.data) {
            await db.insert(holidays).values({
              name: change.data.name as string,
              date: change.data.date as string,
              userId,
            });
          } else if (change.type === "update" && change.id && change.data) {
            await db.update(holidays)
              .set({ name: change.data.name as string, date: change.data.date as string })
              .where(and(eq(holidays.id, change.id), eq(holidays.userId, userId)));
          } else if (change.type === "delete" && change.id) {
            await db.delete(holidays).where(and(eq(holidays.id, change.id), eq(holidays.userId, userId)));
          }
          break;

        case "booking":
          if (change.type === "create" && change.data) {
            await db.insert(bookings).values({
              employeeId: change.data.employeeId as string,
              projectId: change.data.projectId as string,
              date: change.data.date as string,
            });
          } else if (change.type === "delete" && change.id) {
            await db.delete(bookings).where(eq(bookings.id, change.id));
          }
          break;
      }
    }

    return NextResponse.json({ 
      message: `Successfully saved ${changes.length} changes`,
      changesApplied: changes.length,
    });
  } catch (error) {
    console.error("Save changes error:", error);
    return NextResponse.json(
      { error: "Failed to save changes" },
      { status: 500 }
    );
  }
}
