import { normalizePracticeCountry } from "../clinical/practice/practiceCountryRegistry";
import { prisma } from "../prisma";

export type LausuntoWorkspaceAccess = {
  enabled: boolean;
  practiceCountry: string;
  policyEnabled: boolean;
};

type AccessRow = {
  practiceCountry: string | null;
  lausuntoToolEnabled: boolean | null;
};

export async function getLausuntoWorkspaceAccess(userId: number): Promise<LausuntoWorkspaceAccess> {
  const rows = await prisma.$queryRaw<AccessRow[]>`
    SELECT
      cs."practiceCountry" AS "practiceCountry",
      lap."lausuntoToolEnabled" AS "lausuntoToolEnabled"
    FROM "User" u
    LEFT JOIN "UserClinicalSettings" cs ON cs."userId" = u."id"
    LEFT JOIN "UserLausuntoAccessPolicy" lap ON lap."userId" = u."id"
    WHERE u."id" = ${userId}
    LIMIT 1
  `;

  const row = rows[0];
  const practiceCountry = normalizePracticeCountry(row?.practiceCountry ?? "FI");
  const policyEnabled = row?.lausuntoToolEnabled === true;

  return {
    enabled: practiceCountry === "FI" && policyEnabled,
    practiceCountry,
    policyEnabled,
  };
}

export async function getAvailableSidebarKeys(userId: number, allKeys: string[]): Promise<string[]> {
  const access = await getLausuntoWorkspaceAccess(userId);
  if (access.enabled) return allKeys;
  return allKeys.filter((key) => key !== "lausunnot");
}
