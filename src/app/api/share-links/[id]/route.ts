import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shareLinks } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const [existingLink] = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.id, id));

    if (!existingLink) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    if (existingLink.userId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await db.delete(shareLinks).where(eq(shareLinks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting share link:", error);
    return NextResponse.json({ error: "Failed to delete share link" }, { status: 500 });
  }
}
