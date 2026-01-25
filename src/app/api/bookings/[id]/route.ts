import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(bookings).where(eq(bookings.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  }
}
