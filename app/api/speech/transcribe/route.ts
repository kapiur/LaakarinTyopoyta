import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { resolveAiCredential } from "../../../../lib/ai/credentials/resolveAiCredential";
import { getUserAiSettings } from "../../../../lib/ai/userAiSettings";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const DEFAULT_STT_MODEL = "whisper-1";

const SUPPORTED_LANGUAGES = new Set(["fi", "ru", "en", "de", "sv", "et"]);

function normalizeLanguage(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.has(normalized) ? normalized : null;
}

function getFileName(file: File) {
  if (file.name && file.name.trim()) return file.name;
  if (file.type.includes("mp4")) return "dictation.mp4";
  if (file.type.includes("mpeg")) return "dictation.mp3";
  if (file.type.includes("wav")) return "dictation.wav";
  return "dictation.webm";
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number((session?.user as any)?.id);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audio = formData.get("audio");

    // FormData entries are strings or files; Node 18 has no global File constructor.
    if (audio === null || typeof audio === "string") {
      return NextResponse.json({ error: "Äänitiedosto puuttuu." }, { status: 400 });
    }

    if (audio.size <= 0) {
      return NextResponse.json({ error: "Äänitiedosto on tyhjä." }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Äänitiedosto on liian suuri. Jaa sanelu lyhyempiin osiin." }, { status: 413 });
    }

    const settings = await getUserAiSettings(userId);
    const secret = await resolveAiCredential({
      userId,
      provider: "openai",
      credentialMode: settings.credentialMode,
    });

    const speechForm = new FormData();
    speechForm.append("file", audio, getFileName(audio));
    speechForm.append("model", process.env.OPENAI_STT_MODEL || DEFAULT_STT_MODEL);
    speechForm.append("response_format", "json");

    const language = normalizeLanguage(formData.get("language"));
    if (language) speechForm.append("language", language);

    const baseUrl = (secret.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret.value}`,
        ...(secret.projectId ? { "OpenAI-Project": secret.projectId } : {}),
      },
      body: speechForm,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = typeof data?.error?.message === "string" ? data.error.message : "Puheentunnistus epäonnistui.";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const text = typeof data?.text === "string" ? data.text.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Puhetta ei tunnistettu." }, { status: 422 });
    }

    return NextResponse.json({
      text,
      provider: "openai",
      model: process.env.OPENAI_STT_MODEL || DEFAULT_STT_MODEL,
    });
  } catch (error: any) {
    console.error("Speech transcription failed:", error?.message || error);
    return NextResponse.json({
      error: error?.message || "Puheentunnistus epäonnistui.",
    }, { status: 500 });
  }
}
