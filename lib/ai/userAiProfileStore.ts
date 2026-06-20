import { prisma } from "../prisma";
import type { UserAiProfileRecord } from "./userAiProfile";

export async function getUserAiProfile(userId: number): Promise<UserAiProfileRecord | null> {
  try {
    const rows = await prisma.$queryRaw<UserAiProfileRecord[]>`
      SELECT
        "role", "specialty", "workplace", "experienceLevel", "defaultClinicalContext",
        "preferredStructure", "detailLevel", "writingStyle", "permanentInstructions",
        "avoidInstructions", "styleSummary", "useProfileByDefault"
      FROM "UserAiProfile"
      WHERE "userId" = ${userId}
      LIMIT 1
    `;

    return rows[0] ?? null;
  } catch (error) {
    console.error("AI profile loading failed:", error);
    return null;
  }
}
