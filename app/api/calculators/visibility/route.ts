import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { getCalculatorDefinition, getSortedCalculatorDefinitions, isCalculatorKey } from '../../../../lib/calculators/registry';
import { prisma } from '../../../../lib/prisma';

type VisibilityRow = {
  calculatorKey: string;
  isVisible: boolean;
  customOrder: number | null;
};

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

async function getVisibilityRows(userId: number) {
  try {
    return await prisma.$queryRaw<VisibilityRow[]>`
      SELECT "calculatorKey", "isVisible", "customOrder"
      FROM "UserCalculatorPreference"
      WHERE "userId" = ${userId}
    `;
  } catch (error) {
    console.error('Calculator visibility loading failed:', error);
    return [];
  }
}

function buildCalculatorPayload(visibilityRows: VisibilityRow[]) {
  const visibilityMap = new Map(visibilityRows.map((row) => [row.calculatorKey, row]));

  return getSortedCalculatorDefinitions()
    .map((calculator) => {
      const preference = visibilityMap.get(calculator.key);
      return {
        ...calculator,
        customOrder: preference?.customOrder ?? null,
        effectiveOrder: preference?.customOrder ?? calculator.sortOrder,
        isVisible: preference?.isVisible ?? calculator.defaultEnabled,
      };
    })
    .sort((a, b) => {
      return a.effectiveOrder - b.effectiveOrder || a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'fi');
    })
    .map(({ effectiveOrder, ...calculator }) => calculator);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const visibilityRows = await getVisibilityRows(userId);
    const calculators = buildCalculatorPayload(visibilityRows);

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

    const calculatorDefinition = getCalculatorDefinition(calculatorKey);

    if (!calculatorDefinition) {
      return NextResponse.json({ error: 'Unknown calculator' }, { status: 400 });
    }

    const id = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "UserCalculatorPreference" (
        "id", "userId", "calculatorKey", "isVisible", "customOrder", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${userId}, ${calculatorKey}, ${isVisible}, ${calculatorDefinition.sortOrder}, NOW(), NOW()
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

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const orderedKeys = body?.orderedKeys;

    if (!Array.isArray(orderedKeys) || orderedKeys.length === 0) {
      return NextResponse.json({ error: 'orderedKeys must be a non-empty array' }, { status: 400 });
    }

    if (!orderedKeys.every(isCalculatorKey)) {
      return NextResponse.json({ error: 'orderedKeys contains invalid calculator keys' }, { status: 400 });
    }

    if (new Set(orderedKeys).size !== orderedKeys.length) {
      return NextResponse.json({ error: 'orderedKeys must not contain duplicates' }, { status: 400 });
    }

    const defaultKeys = getSortedCalculatorDefinitions().map((calculator) => calculator.key);

    if (orderedKeys.length !== defaultKeys.length || defaultKeys.some((key) => !orderedKeys.includes(key))) {
      return NextResponse.json({ error: 'orderedKeys must include every calculator exactly once' }, { status: 400 });
    }

    await prisma.$transaction(
      orderedKeys.map((calculatorKey, index) =>
        prisma.userCalculatorPreference.upsert({
          where: {
            userId_calculatorKey: { userId, calculatorKey },
          },
          update: {
            customOrder: index + 1,
          },
          create: {
            userId,
            calculatorKey,
            isVisible: getCalculatorDefinition(calculatorKey)?.defaultEnabled ?? true,
            customOrder: index + 1,
          },
        })
      )
    );

    const visibilityRows = await getVisibilityRows(userId);
    const calculators = buildCalculatorPayload(visibilityRows);

    return NextResponse.json({ calculators });
  } catch (error) {
    console.error('Calculator order update failed:', error);
    return NextResponse.json({ error: 'Order update failed' }, { status: 500 });
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
