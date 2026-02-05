import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees, bookings, projects } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { employeeId } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.teamColor !== undefined) updateData.teamColor = body.teamColor;
  if (body.plannedAbsences !== undefined) {
    updateData.plannedAbsences = body.plannedAbsences;

    const employee = await db
      .select()
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (employee[0] && body.plannedAbsences.length > 0) {
      const userProjects = await db
        .select()
        .from(projects)
        .where(and(eq(projects.userId, employee[0].userId), eq(projects.status, "active")));

      if (userProjects.length > 0) {
        await db
          .delete(bookings)
          .where(
            and(
              eq(bookings.employeeId, employeeId),
              inArray(bookings.date, body.plannedAbsences),
              inArray(bookings.projectId, userProjects.map((p) => p.id))
            )
          );
      }
    }
  }

  const [updatedEmployee] = await db
    .update(employees)
    .set(updateData)
    .where(eq(employees.id, employeeId))
    .returning();

  if (!updatedEmployee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  return NextResponse.json(updatedEmployee);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { employeeId } = await params;

  await db.delete(bookings).where(eq(bookings.employeeId, employeeId));

  const [deletedEmployee] = await db
    .delete(employees)
    .where(eq(employees.id, employeeId))
    .returning();

  if (!deletedEmployee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
