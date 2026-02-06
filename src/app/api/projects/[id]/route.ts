import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [project] = await db.select().from(projects).where(eq(projects.id, id));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle snapshotting if project marked as delivered
    if (body.status === "delivered") {
      const [currentProject] = await db.select().from(projects).where(eq(projects.id, id));
      if (currentProject && currentProject.status !== "delivered") {
        const { holidays, employees: employeeTable } = await import("@shared/schema");
        const { inArray } = await import("drizzle-orm");

        // Fetch current holiday data
        const currentHolidays = await db.select().from(holidays).where(eq(holidays.userId, currentProject.userId));
        body.snapshotHolidays = JSON.stringify(currentHolidays.map(h => ({ name: h.name, date: h.date })));

        // Fetch current absence data for assigned employees
        if (currentProject.assignedEmployees && currentProject.assignedEmployees.length > 0) {
          const projectEmployees = await db.select().from(employeeTable).where(inArray(employeeTable.id, currentProject.assignedEmployees));
          const absenceSnapshot: Record<string, string[]> = {};
          projectEmployees.forEach(emp => {
            absenceSnapshot[emp.id] = emp.plannedAbsences || [];
          });
          body.snapshotAbsences = JSON.stringify(absenceSnapshot);
        }
      }
    }

    const [project] = await db.update(projects)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    console.error("Error updating project:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "Project name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(projects).where(eq(projects.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
