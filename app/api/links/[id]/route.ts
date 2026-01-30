import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";

const prisma = new PrismaClient();

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "link";
    const id = parseInt(params.id);
    const currentUserId = (session.user as any).id ? parseInt((session.user as any).id) : null;

    if (type === "category") {
      const category = await prisma.linkCategory.findUnique({
        where: { id },
        include: { _count: { select: { links: true } } }
      });

      if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (category._count.links > 0) return NextResponse.json({ error: "Kategoria ei ole tyhjä" }, { status: 400 });
      if (category.userId !== null && category.userId !== currentUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      await prisma.linkCategory.delete({ where: { id } });
    } else {
      const link = await prisma.quickLink.findUnique({ where: { id } });
      if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (link.userId !== null && link.userId !== currentUserId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      await prisma.quickLink.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
