import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { OpenAI } from "openai";
import { authOptions } from "../../../../../lib/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CURRENT_MODEL = "gpt-5.4";
const MAX_CHUNK_CHARS = 22000;

function tryParseJson(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const fenced = content.match(/```json\s*([\s\S]*?)```/i) || content.match(/```\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1]);
    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(content.slice(first, last + 1));
    throw new Error("AI response was not valid JSON");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const topic = typeof body?.topic === "string" ? body.topic.trim() : "";
    const chunk = typeof body?.chunk === "string" ? body.chunk.trim() : "";
    const index = Number.isFinite(Number(body?.index)) ? Number(body.index) : 1;
    const total = Number.isFinite(Number(body?.total)) ? Number(body.total) : 1;
    const isSource = Boolean(body?.isSource);

    if (!chunk) return NextResponse.json({ error: "Fragmentti puuttuu" }, { status: 400 });
    if (chunk.length > MAX_CHUNK_CHARS) {
      return NextResponse.json({ error: `Fragmentti on liian pitkä. Enimmäispituus on ${MAX_CHUNK_CHARS} merkkiä.` }, { status: 400 });
    }

    const systemPrompt = `
Olet kliininen tekstin tiivistäjä. Poimi annetusta fragmentista vain asiat, joista on hyötyä Terveysasema-lääkärin nopeassa Pikaohjeessa.

Älä tee lopullista ohjekorttia. Älä kirjoita teoriaa. Älä keksi mitään. Säilytä vain toiminnallinen kliininen sisältö.
Palauta tiivis suomenkielinen JSON:
{
  "chunkIndex": number,
  "topic": "aihe",
  "keyPoints": ["toiminnallinen kliininen pointti"],
  "criteria": ["raja-arvo/kriteeri jos fragmentissa on"],
  "actions": ["mitä lääkäri tekee"],
  "urgent": ["päivystys/lähete/hälytysmerkki"],
  "documentation": ["potilaskertomukseen sopiva fraasi tai sisältö"],
  "sources": ["mainittu lähde"],
  "uncertain": ["väite joka vaatii tarkistuksen"]
}
`;

    const response = await openai.chat.completions.create({
      model: CURRENT_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify({ topic, chunk, index, total, isSource }) },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const parsed = tryParseJson(content);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("pikaohjeet-v2 extract-clinical-chunk error:", error);
    return NextResponse.json({ error: "Fragmentin AI-käsittely epäonnistui", details: error?.message || "Unknown error" }, { status: 500 });
  }
}
