import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

const ALLOWED_FORMS = new Set(['LIQUID', 'TABLET']);
const ALLOWED_UNITS = new Set(['MG', 'IU']);

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function parsePositiveNumber(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function parsePositiveInteger(value: unknown) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

function parseOptionalPositiveNumber(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  return parsePositiveNumber(value);
}

function parseOptionalPositiveInteger(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  return parsePositiveInteger(value);
}

function parseIndicationIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );
}

async function getOwnedIndicationIds(userId: number, indicationIds: number[]) {
  if (indicationIds.length === 0) return [];

  const indications = await prisma.pedsIndication.findMany({
    where: {
      userId,
      id: { in: indicationIds },
    },
    select: { id: true },
  });

  return indications.map((item) => item.id);
}

const drugSelect = {
  id: true,
  name: true,
  form: true,
  unit: true,
  strength: true,
  dosePerKgDay: true,
  timesPerDay: true,
  defaultDays: true,
  packageSize: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  indications: {
    select: {
      indication: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      indication: {
        name: 'asc' as const,
      },
    },
  },
};

function serializeDrug(drug: any) {
  return {
    ...drug,
    indications: drug.indications.map((item: any) => item.indication),
  };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const indicationId = Number(searchParams.get('indicationId'));

    const where = Number.isInteger(indicationId) && indicationId > 0
      ? {
          userId,
          indications: {
            some: {
              indicationId,
              indication: { userId },
            },
          },
        }
      : { userId };

    const drugs = await prisma.pedsDrug.findMany({
      where,
      orderBy: [
        { name: 'asc' },
        { form: 'asc' },
        { strength: 'asc' },
      ],
      select: drugSelect,
    });

    return NextResponse.json({ drugs: drugs.map(serializeDrug) });
  } catch (error) {
    console.error('PEDS drugs GET error:', error);
    return NextResponse.json({ error: 'PEDS drugs fetch failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const name = normalizeText(body.name);
    const form = typeof body.form === 'string' ? body.form.toUpperCase() : '';
    const unit = typeof body.unit === 'string' ? body.unit.toUpperCase() : '';
    const strength = parsePositiveNumber(body.strength);
    const dosePerKgDay = parsePositiveNumber(body.dosePerKgDay);
    const timesPerDay = parsePositiveInteger(body.timesPerDay);
    const defaultDays = parseOptionalPositiveInteger(body.defaultDays);
    const packageSize = parseOptionalPositiveNumber(body.packageSize);
    const note = normalizeOptionalText(body.note);
    const indicationIds = parseIndicationIds(body.indicationIds);

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (name.length > 120) {
      return NextResponse.json({ error: 'name is too long' }, { status: 400 });
    }

    if (!ALLOWED_FORMS.has(form)) {
      return NextResponse.json({ error: 'form must be LIQUID or TABLET' }, { status: 400 });
    }

    if (!ALLOWED_UNITS.has(unit)) {
      return NextResponse.json({ error: 'unit must be MG or IU' }, { status: 400 });
    }

    if (!strength) {
      return NextResponse.json({ error: 'strength must be a positive number' }, { status: 400 });
    }

    if (!dosePerKgDay) {
      return NextResponse.json({ error: 'dosePerKgDay must be a positive number' }, { status: 400 });
    }

    if (!timesPerDay || timesPerDay > 12) {
      return NextResponse.json({ error: 'timesPerDay must be an integer between 1 and 12' }, { status: 400 });
    }

    const ownedIndicationIds = await getOwnedIndicationIds(userId, indicationIds);

    if (ownedIndicationIds.length !== indicationIds.length) {
      return NextResponse.json({ error: 'one or more indicationIds are invalid' }, { status: 400 });
    }

    const drug = await prisma.pedsDrug.create({
      data: {
        name,
        form: form as any,
        unit: unit as any,
        strength,
        dosePerKgDay,
        timesPerDay,
        defaultDays,
        packageSize,
        note,
        userId,
        indications: {
          create: ownedIndicationIds.map((indicationId) => ({ indicationId })),
        },
      },
      select: drugSelect,
    });

    return NextResponse.json({ drug: serializeDrug(drug) }, { status: 201 });
  } catch (error: any) {
    console.error('PEDS drugs POST error:', error);

    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'drug already exists' }, { status: 409 });
    }

    return NextResponse.json({ error: 'PEDS drug creation failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'valid id is required' }, { status: 400 });
    }

    const existing = await prisma.pedsDrug.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'drug not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: any = {};

    if (body.name !== undefined) {
      const name = normalizeText(body.name);
      if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
      if (name.length > 120) return NextResponse.json({ error: 'name is too long' }, { status: 400 });
      data.name = name;
    }

    if (body.form !== undefined) {
      const form = typeof body.form === 'string' ? body.form.toUpperCase() : '';
      if (!ALLOWED_FORMS.has(form)) return NextResponse.json({ error: 'form must be LIQUID or TABLET' }, { status: 400 });
      data.form = form;
    }

    if (body.unit !== undefined) {
      const unit = typeof body.unit === 'string' ? body.unit.toUpperCase() : '';
      if (!ALLOWED_UNITS.has(unit)) return NextResponse.json({ error: 'unit must be MG or IU' }, { status: 400 });
      data.unit = unit;
    }

    if (body.strength !== undefined) {
      const strength = parsePositiveNumber(body.strength);
      if (!strength) return NextResponse.json({ error: 'strength must be a positive number' }, { status: 400 });
      data.strength = strength;
    }

    if (body.dosePerKgDay !== undefined) {
      const dosePerKgDay = parsePositiveNumber(body.dosePerKgDay);
      if (!dosePerKgDay) return NextResponse.json({ error: 'dosePerKgDay must be a positive number' }, { status: 400 });
      data.dosePerKgDay = dosePerKgDay;
    }

    if (body.timesPerDay !== undefined) {
      const timesPerDay = parsePositiveInteger(body.timesPerDay);
      if (!timesPerDay || timesPerDay > 12) return NextResponse.json({ error: 'timesPerDay must be an integer between 1 and 12' }, { status: 400 });
      data.timesPerDay = timesPerDay;
    }

    if (body.defaultDays !== undefined) {
      const defaultDays = parseOptionalPositiveInteger(body.defaultDays);
      if (body.defaultDays !== null && body.defaultDays !== '' && !defaultDays) return NextResponse.json({ error: 'defaultDays must be a positive integer or empty' }, { status: 400 });
      data.defaultDays = defaultDays;
    }

    if (body.packageSize !== undefined) {
      const packageSize = parseOptionalPositiveNumber(body.packageSize);
      if (body.packageSize !== null && body.packageSize !== '' && !packageSize) return NextResponse.json({ error: 'packageSize must be a positive number or empty' }, { status: 400 });
      data.packageSize = packageSize;
    }

    if (body.note !== undefined) {
      data.note = normalizeOptionalText(body.note);
    }

    const indicationIds = body.indicationIds !== undefined ? parseIndicationIds(body.indicationIds) : null;

    if (body.indicationIds !== undefined && !Array.isArray(body.indicationIds)) {
      return NextResponse.json({ error: 'indicationIds must be an array' }, { status: 400 });
    }

    if (indicationIds) {
      const ownedIndicationIds = await getOwnedIndicationIds(userId, indicationIds);

      if (ownedIndicationIds.length !== indicationIds.length) {
        return NextResponse.json({ error: 'one or more indicationIds are invalid' }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.pedsDrugIndication.deleteMany({ where: { drugId: id } }),
        prisma.pedsDrug.update({
          where: { id },
          data: {
            ...data,
            indications: {
              create: ownedIndicationIds.map((indicationId) => ({ indicationId })),
            },
          },
        }),
      ]);
    } else {
      await prisma.pedsDrug.update({
        where: { id },
        data,
      });
    }

    const drug = await prisma.pedsDrug.findFirst({
      where: { id, userId },
      select: drugSelect,
    });

    return NextResponse.json({ drug: serializeDrug(drug) });
  } catch (error: any) {
    console.error('PEDS drugs PATCH error:', error);

    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'drug already exists' }, { status: 409 });
    }

    return NextResponse.json({ error: 'PEDS drug update failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'valid id is required' }, { status: 400 });
    }

    await prisma.pedsDrug.deleteMany({
      where: {
        id,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PEDS drugs DELETE error:', error);
    return NextResponse.json({ error: 'PEDS drug deletion failed' }, { status: 500 });
  }
}
