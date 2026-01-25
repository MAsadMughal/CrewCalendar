import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@shared/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, employeeId } = body;

    if (!projectId || !employeeId) {
      return NextResponse.json({ error: "Project ID and Employee ID are required" }, { status: 400 });
    }

    const deleted = await db.delete(bookings)
      .where(and(
        eq(bookings.projectId, projectId),
        eq(bookings.employeeId, employeeId)
      ))
      .returning();

    return NextResponse.json({ success: true, count: deleted.length });
  } catch (error) {
    console.error("Delete bookings by assignment error:", error);
    return NextResponse.json({ error: "Failed to delete bookings" }, { status: 500 });
  }
}
