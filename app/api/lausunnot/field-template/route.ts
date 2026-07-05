import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { getLausuntoWorkspaceAccess } from "../../../../lib/lausunto/access";
import {
  getDefaultLausuntoFieldTemplateConfig,
  normalizeLausuntoFieldTemplate,
  normalizeLausuntoFieldTemplateConfig,
} from "../../../../lib/lausunto/fieldTemplates";
import { prisma } from "../../../../lib/prisma";

const LAUSUNTO_MODES = new Set(["sairausloma", "bc_lausunto", "b_lausunto", "c_lausunto", "oma_lomake"]);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getUserId() {
  const { session, error } = await requireAuthenticatedUser();
  if (error || !session) return { userId: null, error };

  const userId = Number((session.user as any)?.id);
  if (!Number.isFinite(userId)) {
    return { userId: null, error: NextResponse.json({ error: "Käyttäjää ei tunnistettu." }, { status: 401 }) };
  }

  const access = await getLausuntoWorkspaceAccess(userId);
  if (!access.enabled) {
    return { userId: null, error: NextResponse.json({ error: "Lausunto-työkalu ei ole käytössä tälle käyttäjälle." }, { status: 403 }) };
  }

  return { userId, error: null };
}

function readModeAndPurpose(url: string) {
  const searchParams = new URL(url).searchParams;
  const mode = text(searchParams.get("mode"));
  const purpose = text(searchParams.get("purpose")) || "default";

  if (!LAUSUNTO_MODES.has(mode)) {
    return { mode: "", purpose, error: NextResponse.json({ error: "Tuntematon lausuntotyyppi." }, { status: 400 }) };
  }

  return { mode, purpose, error: null };
}

function purposeLabelFromKey(purpose: string) {
  if (purpose === "oma_lomake") return "Oma lomake";
  if (!purpose.startsWith("oma_")) return purpose;
  const label = purpose
    .slice(4)
    .replace(/_/g, " ")
    .trim();

  return label || "Oma lomake";
}

export async function GET(request: Request) {
  const auth = await getUserId();
  if (auth.error || auth.userId === null) return auth.error;

  const parsed = readModeAndPurpose(request.url);
  if (parsed.error) return parsed.error;
  const searchParams = new URL(request.url).searchParams;
  const wantsList = searchParams.get("list") === "1" || searchParams.get("list") === "true";

  if (wantsList && parsed.mode === "oma_lomake") {
    const rows = await prisma.$queryRawUnsafe<Array<{ purpose: string; fields: unknown; updatedAt: Date }>>(
      'SELECT "purpose", "fields", "updatedAt" FROM "UserLausuntoFieldTemplate" WHERE "userId" = $1 AND "mode" = $2 ORDER BY "updatedAt" DESC',
      auth.userId,
      parsed.mode,
    );

    const forms = rows.map((row) => {
      const config = normalizeLausuntoFieldTemplateConfig(row.fields, parsed.mode, row.purpose);
      return {
        purpose: row.purpose,
        name: config.formName || purposeLabelFromKey(row.purpose),
        formDescription: config.formDescription,
        aiInstruction: config.aiInstruction,
        updatedAt: row.updatedAt,
      };
    });

    return NextResponse.json({
      mode: parsed.mode,
      forms,
    });
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ fields: unknown }>>(
    'SELECT "fields" FROM "UserLausuntoFieldTemplate" WHERE "userId" = $1 AND "mode" = $2 AND "purpose" = $3 LIMIT 1',
    auth.userId,
    parsed.mode,
    parsed.purpose,
  );

  const config = normalizeLausuntoFieldTemplateConfig(
    rows[0]?.fields ?? getDefaultLausuntoFieldTemplateConfig(parsed.mode, parsed.purpose),
    parsed.mode,
    parsed.purpose,
  );

  return NextResponse.json({
    mode: parsed.mode,
    purpose: parsed.purpose,
    isDefault: rows.length === 0,
    ...config,
  });
}

export async function PUT(request: Request) {
  const auth = await getUserId();
  if (auth.error || auth.userId === null) return auth.error;

  const body = await request.json().catch(() => ({})) as {
    mode?: unknown;
    purpose?: unknown;
    fields?: unknown;
    aiInstruction?: unknown;
    formDescription?: unknown;
    formName?: unknown;
  };
  const mode = text(body.mode);
  const purpose = text(body.purpose) || "default";

  if (!LAUSUNTO_MODES.has(mode)) {
    return NextResponse.json({ error: "Tuntematon lausuntotyyppi." }, { status: 400 });
  }

  const fields = normalizeLausuntoFieldTemplate(body.fields, mode, purpose);
  if (fields.length === 0) {
    return NextResponse.json({ error: "Rakenteessa pitää olla vähintään yksi kenttä." }, { status: 400 });
  }
  const config = {
    formName: mode === "oma_lomake" ? text(body.formName).slice(0, 160) : "",
    fields,
    aiInstruction: text(body.aiInstruction).slice(0, 2000),
    formDescription: mode === "oma_lomake" ? text(body.formDescription).slice(0, 2000) : "",
  };

  await prisma.$executeRawUnsafe(
    `INSERT INTO "UserLausuntoFieldTemplate" ("id", "userId", "mode", "purpose", "fields", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, CAST($5 AS jsonb), NOW(), NOW())
     ON CONFLICT ("userId", "mode", "purpose")
     DO UPDATE SET "fields" = EXCLUDED."fields", "updatedAt" = NOW()`,
    randomUUID(),
    auth.userId,
    mode,
    purpose,
    JSON.stringify(config),
  );

  return NextResponse.json({
    mode,
    purpose,
    isDefault: false,
    ...config,
  });
}

export async function DELETE(request: Request) {
  const auth = await getUserId();
  if (auth.error || auth.userId === null) return auth.error;

  const parsed = readModeAndPurpose(request.url);
  if (parsed.error) return parsed.error;

  await prisma.$executeRawUnsafe(
    'DELETE FROM "UserLausuntoFieldTemplate" WHERE "userId" = $1 AND "mode" = $2 AND "purpose" = $3',
    auth.userId,
    parsed.mode,
    parsed.purpose,
  );

  return NextResponse.json({
    mode: parsed.mode,
    purpose: parsed.purpose,
    isDefault: true,
    ...getDefaultLausuntoFieldTemplateConfig(parsed.mode, parsed.purpose),
  });
}
