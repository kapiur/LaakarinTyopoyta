import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { templateId, targetEmail } = await request.json();
    const currentUserId = parseInt((session.user as any).id);

    // 1. Находим оригинальный шаблон и проверяем, что он ваш
    const originalTemplate = await prisma.template.findFirst({
      where: { id: templateId, userId: currentUserId },
      include: { category: true }
    });

    if (!originalTemplate) {
      return NextResponse.json({ error: "Mallia ei löytynyt" }, { status: 404 });
    }

    // 2. Находим целевого пользователя по email
    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail.toLowerCase().trim() }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Käyttäjää ei löytynyt" }, { status: 404 });
    }

    // 3. Проверяем/создаем категорию у получателя
    let targetCategory = await prisma.category.findFirst({
      where: { name: originalTemplate.category.name, userId: targetUser.id }
    });

    if (!targetCategory) {
      targetCategory = await prisma.category.create({
        data: { name: originalTemplate.category.name, userId: targetUser.id }
      });
    }

    // 4. Создаем копию шаблона
    const sharedTemplate = await prisma.template.create({
      data: {
        title: `${originalTemplate.title} (Kopio)`,
        content: originalTemplate.content,
        author: originalTemplate.author,
        categoryId: targetCategory.id,
        userId: targetUser.id
      }
    });

    return NextResponse.json({ success: true, message: "Malli jaettu onnistuneesti!" });
  } catch (error) {
    console.error("Share Error:", error);
    return NextResponse.json({ error: "Jakamisvirhe" }, { status: 500 });
  }
}
