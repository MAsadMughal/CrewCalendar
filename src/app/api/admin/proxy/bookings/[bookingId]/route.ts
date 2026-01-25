import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { bookingId } = await params;

  const [deletedBooking] = await db
    .delete(bookings)
    .where(eq(bookings.id, bookingId))
    .returning();

  if (!deletedBooking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
