import { randomUUID } from "crypto";
import { prisma } from "./prisma";

export const MAX_ACTIVE_USER_SESSIONS = 2;
export const USER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const USER_SESSION_VALIDATE_INTERVAL_MS = 15_000;
export const USER_SESSION_TOUCH_INTERVAL_MS = 120_000;

export type UserSessionCreateResult = {
  sessionKey: string;
  replacedPreviousSession: boolean;
};

function buildExpiryDate() {
  return new Date(Date.now() + USER_SESSION_MAX_AGE_SECONDS * 1000);
}

export async function createManagedUserSession(userId: number): Promise<UserSessionCreateResult> {
  const now = new Date();
  const sessionKey = randomUUID();
  const expiresAt = buildExpiryDate();

  return prisma.$transaction(async (tx) => {
    await tx.userAuthSession.create({
      data: {
        userId,
        sessionKey,
        expiresAt,
      },
    });

    const activeSessions = await tx.userAuthSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true },
    });

    const overflowCount = Math.max(0, activeSessions.length - MAX_ACTIVE_USER_SESSIONS);

    if (overflowCount > 0) {
      const sessionIdsToRevoke = activeSessions.slice(0, overflowCount).map((session) => session.id);
      await tx.userAuthSession.updateMany({
        where: { id: { in: sessionIdsToRevoke } },
        data: {
          revokedAt: now,
          revokedReason: "replaced_by_new_login",
        },
      });
    }

    return {
      sessionKey,
      replacedPreviousSession: overflowCount > 0,
    };
  });
}

export async function validateManagedUserSession(userId: number, sessionKey: string) {
  const now = new Date();

  const session = await prisma.userAuthSession.findFirst({
    where: {
      userId,
      sessionKey,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      lastSeenAt: true,
      expiresAt: true,
    },
  });

  return session;
}

export async function touchManagedUserSession(sessionKey: string) {
  await prisma.userAuthSession.updateMany({
    where: {
      sessionKey,
      revokedAt: null,
    },
    data: {
      lastSeenAt: new Date(),
      expiresAt: buildExpiryDate(),
    },
  });
}

export async function revokeManagedUserSession(sessionKey: string, reason: string) {
  await prisma.userAuthSession.updateMany({
    where: {
      sessionKey,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });
}

export async function revokeAllManagedUserSessionsForUser(userId: number, reason: string) {
  await prisma.userAuthSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });
}
