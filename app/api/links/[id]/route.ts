import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const linkId = parseInt(params.id);
  const userId = parseInt(session.user.id);

  try {
    // Проверка владельца перед удалением
    const link = await prisma.quickLink.findUnique({ where: { id: linkId } });
    
    if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (link.userId !== null && link.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.quickLink.delete({ where: { id: linkId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
