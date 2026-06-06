import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { getSortedCalculatorDefinitions, isCalculatorKey } from '../../../../lib/calculators/registry';
import { prisma } from '../../../../lib/prisma';

type VisibilityRow = {
  calculatorKey: string;
  isVisible: boolean;
};

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

async function getVisibilityRows(userId: number) {
  try {
    return await prisma.$queryRaw<VisibilityRow[]>`
      SELECT "calculatorKey", "isVisible"
      FROM "UserCalculatorPreference"
      WHERE "userId" = ${userId}
    `;
  } catch (error) {
    console.error('Calculator visibility loading failed:', error);
    return [];
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const visibilityRows = await getVisibilityRows(userId);
    const visibilityMap = new Map(visibilityRows.map((row) => [row.calculatorKey, row.isVisible]));
    const calculators = getSortedCalculatorDefinitions().map((calculator) => ({
      ...calculator,
      isVisible: visibilityMap.get(calculator.key) ?? calculator.defaultEnabled,
    }));

    return NextResponse.json({ calculators });
  } catch (error) {
    console.error('Calculator visibility API error:', error);
    return NextResponse.json({ error: 'Visibility loading failed' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const calculatorKey = body?.calculatorKey;
    const isVisible = body?.isVisible;

    if (!isCalculatorKey(calculatorKey)) {
      return NextResponse.json({ error: 'Invalid calculator key' }, { status: 400 });
    }

    if (typeof isVisible !== 'boolean') {
      return NextResponse.json({ error: 'isVisible must be boolean' }, { status: 400 });
    }

    const id = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "UserCalculatorPreference" (
        "id", "userId", "calculatorKey", "isVisible", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${userId}, ${calculatorKey}, ${isVisible}, NOW(), NOW()
      )
      ON CONFLICT ("userId", "calculatorKey")
      DO UPDATE SET
        "isVisible" = EXCLUDED."isVisible",
        "updatedAt" = NOW()
    `;

    return NextResponse.json({ calculatorKey, isVisible });
  } catch (error) {
    console.error('Calculator visibility update failed:', error);
    return NextResponse.json({ error: 'Visibility update failed' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.$executeRaw`
      DELETE FROM "UserCalculatorPreference"
      WHERE "userId" = ${userId}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Calculator visibility reset failed:', error);
    return NextResponse.json({ error: 'Visibility reset failed' }, { status: 500 });
  }
}
