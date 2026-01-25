import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holidays } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ holidayId: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { holidayId } = await params;
  const body = await request.json();

  const [updatedHoliday] = await db
    .update(holidays)
    .set(body)
    .where(eq(holidays.id, holidayId))
    .returning();

  if (!updatedHoliday) {
    return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
  }

  return NextResponse.json(updatedHoliday);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ holidayId: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { holidayId } = await params;

  const [deletedHoliday] = await db
    .delete(holidays)
    .where(eq(holidays.id, holidayId))
    .returning();

  if (!deletedHoliday) {
    return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
