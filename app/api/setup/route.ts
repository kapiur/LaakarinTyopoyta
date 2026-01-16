import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  const hashedPassword = await bcrypt.hash("Kaalinen12!", 10);
  try {
    const user = await prisma.user.create({
      data: {
        email: "jurii@kapustin.fi",
        password: hashedPassword,
        name: "Admin"
      }
    });
    return NextResponse.json({ message: "User created", email: user.email });
  } catch (e) {
    return NextResponse.json({ error: "User might already exist" }, { status: 400 });
  }
}
