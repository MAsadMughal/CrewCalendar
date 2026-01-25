import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { employees, bookings } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json({ error: "Failed to fetch employee" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Get current employee to find new absences
    const [currentEmployee] = await db.select().from(employees).where(eq(employees.id, id));
    const oldAbsences = new Set(currentEmployee?.plannedAbsences || []);
    
    // Validate plannedAbsences are valid date strings (YYYY-MM-DD)
    if (body.plannedAbsences) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const invalidDates = body.plannedAbsences.filter((d: string) => !dateRegex.test(d));
      if (invalidDates.length > 0) {
        return NextResponse.json({ 
          error: `Invalid date format. Use YYYY-MM-DD. Invalid: ${invalidDates.join(', ')}` 
        }, { status: 400 });
      }
    }

    const [employee] = await db.update(employees)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(employees.id, id))
      .returning();

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Delete bookings for new absence dates
    const newAbsences = (body.plannedAbsences || []).filter((d: string) => !oldAbsences.has(d));
    if (newAbsences.length > 0) {
      await db.delete(bookings).where(
        and(
          eq(bookings.employeeId, id),
          inArray(bookings.date, newAbsences)
        )
      );
    }

    return NextResponse.json(employee);
  } catch (error: any) {
    console.error("Error updating employee:", error);
    if (error.code === "23505") {
      return NextResponse.json({ error: "Employee name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(employees).where(eq(employees.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
