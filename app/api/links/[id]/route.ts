import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; // На один уровень глубже

const prisma = new PrismaClient();

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const linkId = parseInt(params.id);
    const currentUserId = (session.user as any).id ? parseInt((session.user as any).id) : null;

    // Сначала найдем ссылку, чтобы проверить права
    const link = await prisma.quickLink.findUnique({
      where: { id: linkId }
    });

    if (!link) {
      return NextResponse.json({ error: "Ei löydy" }, { status: 404 });
    }

    // Проверка: личную ссылку может удалить только владелец
    // Если userId у ссылки null, она общая (удаление разрешено всем или добавьте проверку роли)
    if (link.userId !== null && link.userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.quickLink.delete({
      where: { id: linkId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE link error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
