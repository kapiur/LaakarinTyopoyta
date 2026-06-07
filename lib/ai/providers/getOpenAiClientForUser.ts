import { OpenAI } from "openai";
import { prisma } from "../../prisma";
import { resolveAiCredential } from "../credentials/resolveAiCredential";
import { getUserAiSettings } from "../userAiSettings";

export async function getOpenAiClientForUser(userId: number, fallbackModel = "gpt-5.4") {
  const settings = await getUserAiSettings(userId);
  const provider = settings.defaultProvider || "openai";

  if (provider !== "openai") {
    throw new Error(`Selected AI provider is not yet supported for this route: ${provider}`);
  }

  const secret = await resolveAiCredential({
    userId,
    provider: "openai",
    credentialMode: settings.credentialMode,
  });

  if (secret.source === "user") {
    await prisma.userAiCredential.updateMany({
      where: {
        userId,
        provider: "openai",
      },
      data: {
        lastUsedAt: new Date(),
      },
    });
  } else if (secret.source === "platform") {
    await prisma.aiProviderCredential.updateMany({
      where: {
        provider: "openai",
      },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  return {
    client: new OpenAI({
      apiKey: secret.value,
      ...(secret.baseUrl ? { baseURL: secret.baseUrl } : {}),
    }),
    model: secret.defaultModel || settings.defaultModel || fallbackModel,
    credentialSource: secret.source ?? "platform",
  };
}
