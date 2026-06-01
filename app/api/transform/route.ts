import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// Always run on the server, never statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-haiku-4-5";
const MAX_INPUT_CHARS = 6000;

const SYSTEM_PROMPT = `You are vanillizator, a crypto text engine. You take a user's input and return TWO rewrites of the same content as JSON.

Return ONLY a single JSON object, no prose, no markdown fences, with exactly these keys:
{
  "vanilla": "<clean, professional version>",
  "unhinged": "<4am crypto degen version>"
}

VANILLA:
- Clean, clear, professional. The kind of copy a serious project or a comms team would ship.
- Correct grammar, proper capitalization and punctuation.
- Neutral-to-confident tone. No slang.

UNHINGED:
- 4am crypto degen energy. Heavy crypto/CT slang (gm, ser, ngmi, wagmi, fren, anon, bags, send it, ape, cooked, locked in, etc.) used naturally, not stuffed.
- all lowercase.
- deliberate typos and sloppy spacing are good. keyboard-mashing energy but still readable.
- NEVER use em-dashes or en-dashes. use commas, periods, or just run-ons.
- unfiltered, overcaffeinated, terminally online.

CRITICAL RULES FOR BOTH:
- Keep every factual claim TRUE to the input. Do not invent numbers, names, dates, partnerships, or promises. Tone changes, facts do not.
- Roughly preserve the meaning and length of the original.
- Do not add disclaimers or commentary about the task.`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  let text: string;
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  text = text.trim();
  if (!text) {
    return NextResponse.json({ error: "Please provide some text." }, { status: 400 });
  }
  if (text.length > MAX_INPUT_CHARS) {
    return NextResponse.json(
      { error: `Text is too long (max ${MAX_INPUT_CHARS} characters).` },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          // Caches the system prefix once it crosses the model's minimum size;
          // a no-op below that, but keeps the call cache-ready as the prompt grows.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Rewrite the following text. Return only the JSON object.\n\n<text>\n${text}\n</text>`,
        },
      ],
    });

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const parsed = extractJson(raw);
    if (!parsed || typeof parsed.vanilla !== "string" || typeof parsed.unhinged !== "string") {
      return NextResponse.json(
        { error: "The model returned an unexpected response. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      vanilla: parsed.vanilla.trim(),
      unhinged: parsed.unhinged.trim(),
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 502;
      return NextResponse.json(
        { error: `Upstream error: ${err.message}` },
        { status }
      );
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// Pull the first balanced JSON object out of the model's text response.
function extractJson(s: string): { vanilla?: unknown; unhinged?: unknown } | null {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = s.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}
