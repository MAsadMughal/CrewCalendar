import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const deleted = await db.delete(bookings)
      .where(eq(bookings.projectId, projectId))
      .returning();

    return NextResponse.json({ success: true, count: deleted.length });
  } catch (error) {
    console.error("Delete bookings by project error:", error);
    return NextResponse.json({ error: "Failed to delete bookings" }, { status: 500 });
  }
}
