import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  // --- НАСТРОЙКИ НОВОГО ПОЛЬЗОВАТЕЛЯ ---
  const newUserEmail = "dmitrii.tsitskarava@gmail.com"; // Email коллеги
  const newUserPassword = "Tsitskarava87";      // Временный пароль
  const newUserName = "Dr. Dmitrii";          // Имя
  // -------------------------------------

  try {
    const hashedPassword = await bcrypt.hash(newUserPassword, 10);
    
    const user = await prisma.user.create({
      data: {
        email: newUserEmail.toLowerCase().trim(),
        password: hashedPassword,
        name: newUserName
      }
    });

    return NextResponse.json({ 
      message: "Käyttäjä luotu onnistuneesti!", 
      email: user.email 
    });
  } catch (e) {
    return NextResponse.json({ 
      error: "Virhe: Käyttäjä on jo olemassa tai tietokantavirhe." 
    }, { status: 400 });
  }
}
