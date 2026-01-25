import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { holidays } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [holiday] = await db.update(holidays)
      .set(body)
      .where(eq(holidays.id, id))
      .returning();

    if (!holiday) {
      return NextResponse.json({ error: "Holiday not found" }, { status: 404 });
    }

    return NextResponse.json(holiday);
  } catch (error) {
    console.error("Error updating holiday:", error);
    return NextResponse.json({ error: "Failed to update holiday" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(holidays).where(eq(holidays.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json({ error: "Failed to delete holiday" }, { status: 500 });
  }
}
